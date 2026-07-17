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
  Clock,
  TrendingUp,
  Award,
  ClipboardCheck,
  Flag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useFeaturedAthletes,
  type FeaturedAthlete,
} from '@/lib/hooks/use-landing-data';
// Direct import (not barrel) — the marketing barrel re-exports server
// components like CaseStudyTagStrip that pull next/headers in via supabase/server.
// Bundling that into this client component's graph produces a runtime 500.
import { FEATURED_SCHOOLS } from '@/lib/data/schools';
import { BrandLogoCollage } from '@/components/marketing/BrandLogoCollage';

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

/**
 * Scroll-triggered entrance wrapper. Pairs with .reveal-on-scroll /
 * .reveal-tilt in globals.css. Respects prefers-reduced-motion (content
 * renders visible immediately, no observer).
 */
function Reveal({
  children,
  className = '',
  delay = 0,
  tilt = false,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  tilt?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRevealed(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal-on-scroll${tilt ? ' reveal-tilt' : ''}${revealed ? ' is-revealed' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

function HeroSection() {
  return (
    <section
      className="relative isolate flex min-h-[88svh] items-center overflow-hidden bg-[var(--ink)]"
      aria-label="Hero - Keep your grades up, StatStaq runs your NIL"
      role="region"
    >
      {/* Full-bleed cinematic backdrop — stadium film with live mist.
          Base image carries LCP + the reduced-motion/Ken-Burns fallback;
          the film layer (same scene) plays on top for real fog motion.
          Documented dark-hero exception: see DESIGN.md §3. */}
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <Image
          src="/editorial/photo-02.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="hero-kenburns object-cover saturate-[0.35] contrast-105"
        />
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/editorial/photo-02.jpg"
          className="absolute inset-0 h-full w-full object-cover saturate-[0.35] contrast-105 motion-reduce:hidden"
        >
          <source src="/editorial/hero.mp4" type="video/mp4" />
        </video>
        {/* drifting fog layers — slow, cream-tinted, reduced-motion-safe */}
        <div className="hero-fog hero-fog-a" />
        <div className="hero-fog hero-fog-b" />
        {/* cobalt duotone wash */}
        <div className="absolute inset-0 bg-[var(--cobalt)]/30 mix-blend-multiply" />
        {/* ink scrim, heaviest behind the type */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#16182B]/90 via-[#16182B]/60 to-[#16182B]/20" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#16182B]/70 to-transparent" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 sm:py-28 lg:px-8">
        <div className="max-w-3xl text-center lg:text-left">
          <div className="hero-reveal hero-reveal-1 eyebrow mb-6 text-[var(--cream-surface)]/70!">
            Part of StatStaq · NCAA compliant
          </div>

          {/* Headline — staggered rise, cobalt plate on the promise.
              The plate is an atomic inline-block so its box takes part in
              line layout instead of painting over the line above. */}
          <h1 className="hero-reveal hero-reveal-2 font-display text-[clamp(52px,8vw,104px)] text-[var(--cream-surface)] mb-8">
            Keep your grades up.{' '}
            <span className="mt-2 inline-block bg-[var(--cobalt)] px-4 py-1 text-[var(--cream-surface)]">
              We&apos;ll run your NIL.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="hero-reveal hero-reveal-3 mx-auto mb-8 max-w-xl text-lg leading-relaxed text-[var(--cream-surface)]/85 sm:text-xl lg:mx-0">
            GradeUp is the scholar-athlete layer of StatStaq. Verify your GPA, and
            StatStaq&apos;s team produces your content, values your brand, sources your
            deals, and negotiates your contracts.
          </p>

          {/* Stat strip (claim-free), translucent for the dark hero */}
          <div className="hero-reveal hero-reveal-4 mb-8 inline-flex flex-wrap items-center gap-x-4 gap-y-1 rounded-full border border-[var(--cream-surface)]/25 bg-[var(--cream-surface)]/10 px-4 py-2 font-[family-name:var(--font-geist-mono)] text-[13px] uppercase tracking-[0.06em] text-[var(--cream-surface)]/90 backdrop-blur-sm">
            <span>Verified GPA <b>3 tiers</b></span>
            <span className="opacity-40">·</span>
            <span>Sourced <b>15%</b></span>
            <span className="opacity-40">·</span>
            <span>You bring <b>0%</b></span>
          </div>

          {/* CTAs */}
          <div className="hero-reveal hero-reveal-5 flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
            <Link href="/signup/athlete">
              <Button
                size="lg"
                className="btn-marketing-primary w-full gap-2 shadow-lg sm:w-auto"
                aria-label="Qualify with your GPA - free signup"
              >
                Qualify with your GPA
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Button>
            </Link>
            <Link href="/signup/brand">
              <Button
                size="lg"
                className="w-full border border-[var(--cream-surface)]/40 bg-transparent text-[var(--cream-surface)] hover:bg-[var(--cream-surface)]/10 sm:w-auto"
                aria-label="Partner with GradeUp as a brand"
              >
                Partner as Brand
              </Button>
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="hero-reveal hero-reveal-6 mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[var(--cream-surface)]/75 lg:justify-start">
            <div className="flex items-center gap-1.5">
              <Shield className="h-4 w-4" aria-hidden="true" />
              <span>NCAA compliant</span>
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

  // Featured schools moved to a shared module so /schools can reuse them.
  // Now includes 18 HS programs alongside NCAA + HBCU, rendered with
  // letter-avatars when no Wikipedia logo is available.
  const schools = FEATURED_SCHOOLS;

  // Brand wordmarks — rendered as stylized text rather than image logos.
  //
  // Why text instead of logos? Wikipedia Commons URLs for brand logos are
  // unreliable (most of our candidates returned 404), and Clearbit's free
  // logo endpoint was sunsetted by HubSpot in 2023. Rather than ship broken
  // images, we render each brand as its name in a uniform grayscale wordmark
  // — the same aesthetic pattern used by competitor directory pages where
  // 'audible', 'classpass', 'LaserAway' etc. appear as stylized text.
  //
  // Per-brand `family` overrides let a few brands use their signature letter
  // treatment (italics, lowercase-only, etc.) so the row feels varied, not
  // like a list.
  const brands: Array<{ name: string; display?: string; italic?: boolean; lowercase?: boolean }> = [
    { name: 'Nike', lowercase: false },
    { name: 'Under Armour' },
    { name: 'Adidas', lowercase: true },
    { name: 'Puma', lowercase: true },
    { name: 'New Balance' },
    { name: 'Subway' },
    { name: "Papa John's" },
    { name: 'Chipotle' },
    { name: "Wendy's" },
    { name: "McDonald's" },
    { name: "Raising Cane's" },
    { name: 'Chick-fil-A' },
    { name: 'Gatorade' },
    { name: 'Powerade' },
    { name: 'Dr Pepper' },
    { name: 'Red Bull' },
    { name: 'Celsius', italic: true },
    { name: 'Cricket Wireless' },
    { name: 'State Farm' },
    { name: 'AT&T' },
    { name: 'Beats by Dre' },
    { name: 'Panini' },
  ];

  return (
    <section
      ref={sectionRef}
      className="py-16 bg-[var(--cream-section)] border-y border-[var(--hairline)] overflow-hidden"
      aria-label="Trusted network of schools and brands"
      role="region"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Explore Teams — section header with View all escape */}
        <div
          className={`flex items-end justify-between mb-8 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div>
            <div className="eyebrow mb-2">Trusted network</div>
            <h2 className="font-display text-2xl md:text-3xl text-[var(--ink)]">
              Explore Teams
            </h2>
            <p className="mt-1 text-sm text-[var(--ink-meta)]">
              Built for scholar-athletes at schools like these
            </p>
          </div>
          <Link
            href="/schools"
            className="text-sm font-semibold text-[var(--cobalt)] hover:text-[var(--cobalt-hover)] transition-colors whitespace-nowrap"
          >
            View all schools <span aria-hidden="true">→</span>
          </Link>
        </div>

        {/* 2-row auto-scrolling marquee of team cards. Same card shape as
            before, now with letter-avatar fallback for schools without a
            logo URL. Two rows share one grid that scrolls horizontally via
            CSS @keyframes; list is doubled for a seamless loop and paused
            on hover so cards are clickable. Mask-image fades the edges. */}
        <div
          className={`relative transition-all duration-700 ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            maskImage:
              'linear-gradient(to right, transparent 0, black 5%, black 95%, transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(to right, transparent 0, black 5%, black 95%, transparent 100%)',
          }}
        >
          <div
            className="grid grid-rows-2 grid-flow-col gap-3 md:gap-4 hover:[animation-play-state:paused] will-change-transform"
            style={{
              width: 'max-content',
              animation: 'team-strip-scroll 90s linear infinite',
            }}
          >
            {[...schools, ...schools].map((school, index) => (
              <Link
                key={`${school.name}-${index}`}
                href={`/athletes?school=${encodeURIComponent(school.name)}`}
                className="group flex items-center gap-3 w-[260px] md:w-[280px] p-3 md:p-4 rounded-xl border border-[var(--hairline)] bg-[var(--cream-surface)] hover:border-[var(--cobalt)] hover:shadow-[0_12px_30px_-20px_rgba(22,24,43,0.35)] transition-colors"
                aria-label={`Browse ${school.fullName} athletes`}
              >
                <div
                  className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center p-1.5 group-hover:scale-105 transition-transform"
                  style={{
                    backgroundColor: `${school.color}1A`,
                    boxShadow: `0 0 0 1px ${school.color}33 inset`,
                  }}
                >
                  {school.logo ? (
                    <Image
                      src={school.logo}
                      alt=""
                      width={36}
                      height={36}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="font-bold text-sm md:text-base leading-none"
                      style={{ color: school.color }}
                    >
                      {school.abbrev ?? school.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="text-sm md:text-base font-semibold text-[var(--ink)] group-hover:text-[var(--cobalt)] transition-colors truncate">
                  {school.fullName}
                </span>
              </Link>
            ))}
          </div>
        </div>
        {/* Keyframes consolidated in the single <style jsx> block at the
            bottom of this section — Next.js disallows nested styled-jsx. */}

        {/* Brand Partners — continuous-scroll wordmark strip.
            Uses a CSS-only keyframe marquee; the list is doubled in the DOM
            so the 50%-translate loops seamlessly. Grayscale text wordmarks
            sidestep the brittleness of external logo URLs. */}
        <div
          className={`mt-12 pt-10 border-t border-[var(--hairline)] transition-all duration-700 ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ transitionDelay: isVisible ? '600ms' : '0ms' }}
        >
          <p className="eyebrow text-center mb-10">
            The kinds of brands that run NIL deals
          </p>
          <div
            className="relative overflow-hidden"
            style={{
              maskImage:
                'linear-gradient(to right, transparent 0, black 8%, black 92%, transparent 100%)',
              WebkitMaskImage:
                'linear-gradient(to right, transparent 0, black 8%, black 92%, transparent 100%)',
            }}
          >
            <div
              className="flex items-center gap-16 whitespace-nowrap will-change-transform"
              style={{
                animation: 'brand-strip-scroll 60s linear infinite',
                width: 'max-content',
              }}
            >
              {[...brands, ...brands].map((brand, i) => (
                <span
                  key={`${brand.name}-${i}`}
                  title={brand.name}
                  className={`flex-shrink-0 text-2xl md:text-3xl font-semibold tracking-tight text-[var(--ink-meta)] hover:text-[var(--cobalt)] transition-colors duration-300 select-none ${
                    brand.italic ? 'italic' : ''
                  } ${brand.lowercase ? 'lowercase' : ''}`}
                  style={{ fontFamily: "var(--font-anton), 'Arial Narrow', sans-serif" }}
                >
                  {brand.display ?? brand.name}
                </span>
              ))}
            </div>
          </div>
          <style jsx>{`
            @keyframes brand-strip-scroll {
              from { transform: translateX(0); }
              to { transform: translateX(-50%); }
            }
            @keyframes team-strip-scroll {
              from { transform: translateX(0); }
              to { transform: translateX(-50%); }
            }
          `}</style>
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
          <div className="absolute top-3 left-3 bg-[var(--cobalt)]/90 text-[var(--cream-surface)] px-2 py-1 rounded-full text-xs font-bold shadow-md">
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
        <div className="text-xs font-semibold text-[var(--cobalt)] tracking-wider mb-1">
          {athlete.school.toUpperCase()}
        </div>
        <h3 className="text-lg font-bold text-[var(--ink)] mb-1">{athlete.name}</h3>
        <p className="text-sm text-[var(--ink-muted)] mb-3">
          {athlete.sport}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-[var(--ink-meta)]">
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

  // Content-integrity: with no real opted-in athletes yet, hide the section
  // entirely rather than showcase fabricated people and earnings.
  if (!loading && athletes.length === 0) {
    return null;
  }

  return (
    <section
      id="athletes"
      className="section-spacing-md bg-[var(--cream)]"
      aria-label="Featured scholar-athletes"
      role="region"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="eyebrow mb-4 justify-center flex">Real Athletes, Real Earnings</div>
          <h2 className="font-display text-3xl sm:text-4xl text-[var(--ink)] mb-4">
            Scholar-Athletes <span className="text-[var(--cobalt)]">Getting Paid</span>
          </h2>
          <p className="text-[var(--ink-muted)] max-w-2xl mx-auto">
            Meet verified athletes earning through GradeUp. Their GPA is their competitive advantage.
          </p>
        </div>

        {/* Athletes Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 stagger-children">
          {loading ? (
            // Loading skeleton
            [...Array(4)].map((_, i) => (
              <div key={i} className="card-marketing animate-pulse">
                <div className="h-48 bg-[var(--cream-section)]" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-[var(--cream-section)] rounded w-1/2" />
                  <div className="h-5 bg-[var(--cream-section)] rounded w-3/4" />
                  <div className="h-4 bg-[var(--cream-section)] rounded w-1/3" />
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
            <h3 className="font-display text-2xl text-[var(--ink)] mb-2">See Yourself Here?</h3>
            <p className="text-[var(--ink-muted)] text-lg">
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
          <div className="flex flex-wrap items-center justify-center gap-6 mt-6 text-sm text-[var(--ink-meta)]">
            <div className="flex items-center gap-1.5">
              <BadgeCheck className="h-4 w-4 text-[var(--cobalt)]" aria-hidden="true" />
              <span>All athletes verified</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-[var(--cobalt)]" aria-hidden="true" />
              <span>NCAA compliant</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-[var(--cobalt)]" aria-hidden="true" />
              <span>StatStaq runs the deals</span>
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
    icon: ClipboardCheck,
    title: 'Create Profile',
    description: 'Sign up and connect your academic records in minutes.',
    stat: 'Takes minutes',
    color: 'cyan' as const,
  },
  {
    number: '02',
    icon: Flag,
    title: 'Get Verified',
    description: 'We verify your enrollment, sport, and GPA for authenticity.',
    stat: 'GPA verified',
    color: 'lime' as const,
  },
  {
    number: '03',
    icon: TrendingUp,
    title: 'StatStaq Runs It',
    description:
      "StatStaq's team produces your content, values your brand, sources your deals, and negotiates your contracts.",
    stat: 'StatStaq takes over',
    color: 'gold' as const,
  },
];

function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="section-spacing-lg bg-[var(--cream-section)] overflow-hidden"
      aria-label="How GradeUp works"
      role="region"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <Reveal className="text-center mb-12 lg:mb-16">
          <div className="eyebrow mb-4 justify-center flex">See It In Action</div>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-[var(--ink)] mb-4">
            From <span className="text-[var(--cobalt)]">Verified GPA</span> to{' '}
            <span className="text-[var(--cobalt)]">StatStaq Deal</span>
          </h2>
          <p className="text-[var(--ink-muted)] max-w-2xl mx-auto text-lg">
            GradeUp verifies the grades. StatStaq runs the deal. Three steps, start to signed.
          </p>
        </Reveal>

        {/* Two-column layout: editorial image + steps */}
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          {/* Sticky duotone editorial image — the coach's playbook */}
          <Reveal tilt className="hidden lg:block lg:sticky lg:top-24">
            <div className="relative">
              <div
                className="duotone relative aspect-[4/5] rounded-[28px] overflow-hidden border border-[var(--hairline)] shadow-[0_40px_90px_-40px_rgba(22,24,43,0.45)] bg-cover bg-center"
                style={{ backgroundImage: `url(/editorial/photo-playbook.jpg)` }}
                role="img"
                aria-label="Coach's notebook with a play diagrammed, representing the verified path from grades to a StatStaq deal"
              />
              {/* floating caption chip */}
              <div className="stat-strip absolute left-6 bottom-6 right-6 !bg-[var(--cream-surface)]/95 backdrop-blur-sm text-center">
                Produce · Value · Source · <b>Negotiate</b>
              </div>
            </div>
          </Reveal>

          {/* Steps */}
          <div className="space-y-4">
            <Reveal className="mb-4 lg:mb-6 text-center lg:text-left">
              <h3 className="font-display text-lg sm:text-xl text-[var(--ink)] mb-1 sm:mb-2">Three Simple Steps</h3>
              <p className="text-xs sm:text-sm text-[var(--ink-meta)]">
                StatStaq&apos;s team runs outreach, negotiation, and close — you focus on your grades.
              </p>
            </Reveal>

            {steps.map((step, index) => (
              <Reveal key={step.number} delay={index * 120}>
                <div className="relative card-marketing p-5 border-l-4 border-[var(--cobalt)]/40 hover:bg-[var(--cream)] transition-colors">
                  {/* Connector */}
                  {index < steps.length - 1 && (
                    <div className="absolute left-[calc(2rem-1px)] -bottom-4 w-0.5 h-4 bg-gradient-to-b from-[var(--hairline)] to-transparent" />
                  )}

                  <div className="flex items-start gap-4">
                    {/* Cobalt flag/number marker */}
                    <div className="relative flex-shrink-0 w-12 h-12 rounded-xl bg-[var(--cobalt)] text-[var(--cream-surface)] flex items-center justify-center">
                      <step.icon className="h-6 w-6" />
                      <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--ink)] text-[10px] font-bold text-[var(--cream-surface)]">
                        {step.number}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-display text-lg text-[var(--ink)] mb-1">{step.title}</h4>
                      <p className="text-sm text-[var(--ink-muted)] mb-2">{step.description}</p>
                      <span className="stat-strip inline-block px-3 py-1">
                        {step.stat}
                      </span>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}

            {/* CTA after steps */}
            <Reveal delay={steps.length * 120} className="pt-4">
              <Link href="/signup/athlete">
                <Button size="lg" className="w-full btn-marketing-primary gap-2">
                  Start Your Journey
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <p className="text-center text-xs text-[var(--ink-meta)] mt-3">
                Free to join • No credit card required
              </p>
            </Reveal>
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
      className="section-spacing-md bg-[var(--cream-section)]"
      aria-label="Brand partnership opportunities"
      role="region"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Content */}
          <Reveal>
            <div className="eyebrow mb-4">For Brands</div>
            <h2 className="font-display text-3xl sm:text-4xl text-[var(--ink)] mb-6">
              Partner with <span className="text-[var(--cobalt)]">Tomorrow&apos;s Leaders</span>
            </h2>
            <p className="text-[var(--ink-muted)] text-lg mb-8">
              Access a curated network of verified scholar-athletes who excel academically.
              StatStaq&apos;s team sources the deal and negotiates the contract — so you get
              results, not resumes.
            </p>

            {/* Features */}
            <ul className="space-y-4 mb-8">
              {brandFeatures.map((feature, index) => (
                <li key={feature.text}>
                  <Reveal delay={index * 90} className="flex items-center gap-3">
                    <feature.icon className="h-5 w-5 text-[var(--cobalt)] flex-shrink-0" />
                    <span className="text-[var(--ink-muted)]">{feature.text}</span>
                  </Reveal>
                </li>
              ))}
            </ul>

            {/* Brand proof points */}
            <div className="stat-strip grid grid-cols-3 gap-4 mb-8 p-4 !rounded-xl">
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--cobalt)]">Verified</div>
                <div className="text-xs text-[var(--ink-meta)] normal-case tracking-normal">Academic + athletic</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--cobalt)]">StatStaq</div>
                <div className="text-xs text-[var(--ink-meta)] normal-case tracking-normal">Handles outreach</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--cobalt)]">NCAA</div>
                <div className="text-xs text-[var(--ink-meta)] normal-case tracking-normal">Compliant deals</div>
              </div>
            </div>

            <Link href="/signup/brand">
              <Button size="lg" className="btn-marketing-primary gap-2">
                Start Partnering
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </Reveal>

          {/* Interactive brand-wordmark collage — the kinds of brands that
              run NIL deals (honest framing, no partnership claims) */}
          <Reveal tilt className="relative mx-auto w-full max-w-md lg:max-w-none">
            <BrandLogoCollage />
          </Reveal>
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
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Social proof */}
        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-[var(--cream-surface)] border border-[var(--hairline)] mb-8">
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
                alt=""
                aria-hidden="true"
                width={32}
                height={32}
                className="w-8 h-8 rounded-full border-2 border-[var(--cream-surface)] object-cover"
                loading="lazy"
              />
            ))}
          </div>
          <span className="text-sm text-[var(--ink-muted)] font-medium">Scholar-athletes already qualifying with GradeUp</span>
        </div>

        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-[var(--ink)] mb-6">
          Ready to Let
          <span className="block">StatStaq Run Your NIL?</span>
        </h2>
        <p className="text-xl text-[var(--ink-muted)] mb-10 max-w-2xl mx-auto">
          GradeUp qualifies you. StatStaq represents you. Verify your grades, and their team
          takes it from there.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/signup/athlete">
            <Button
              size="lg"
              className="w-full sm:w-auto btn-marketing-primary gap-2"
            >
              Join as Athlete
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="/signup/brand">
            <Button
              size="lg"
              className="w-full sm:w-auto btn-marketing-outline"
            >
              Partner as Brand
            </Button>
          </Link>
        </div>

        {/* Final trust indicators */}
        <div className="flex flex-wrap justify-center gap-6 mt-8 text-sm text-[var(--ink-meta)]">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-[var(--cobalt)]" />
            GPA verification required
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-[var(--cobalt)]" />
            StatStaq negotiates for you
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-[var(--cobalt)]" />
            NCAA compliant, always
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
      className="bg-[var(--cream-section)] py-12 sm:py-16"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--cream-surface)] p-6 sm:p-10">
          <div className="relative grid gap-6 md:grid-cols-[2fr_1fr] md:items-center">
            <div>
              <span className="eyebrow inline-flex items-center gap-2 rounded-full border border-[var(--hairline)] bg-[var(--cream)] px-3 py-1">
                New · Free
              </span>
              <h2 className="mt-4 font-display text-3xl text-[var(--ink)] sm:text-4xl">
                What&rsquo;s your scholar-athlete worth?
              </h2>
              <p className="mt-3 max-w-xl text-[var(--ink-muted)]">
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
      className="bg-[var(--cream)] py-20 border-y border-[var(--hairline)]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-[var(--hairline)] bg-[var(--cream-surface)] p-8 md:p-12">
          <div className="relative grid gap-6 md:grid-cols-[2fr_1fr] md:items-center">
            <div>
              <span className="eyebrow inline-flex items-center gap-2 rounded-full border border-[var(--hairline)] bg-[var(--cream)] px-3 py-1">
                Proven results
              </span>
              <h2 className="mt-4 font-display text-3xl text-[var(--ink)] sm:text-4xl">
                Real deals. Verified earnings. Public case studies.
              </h2>
              <p className="mt-3 max-w-xl text-[var(--ink-muted)]">
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
      {/* FeaturedAthletesSection intentionally unmounted while the pilot
          directory has no public opted-in athletes — it SSR'd its heading +
          skeletons and then vanished client-side. Re-mount when real
          athletes exist (the component already hides itself when empty). */}
      <HowItWorksSection />
      <ForBrandsSection />
      <ProvenResultsCTASection />
      <FinalCTASection />
    </>
  );
}
