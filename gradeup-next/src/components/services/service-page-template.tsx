'use client';

import { useState, useRef, useEffect, type ReactNode, type CSSProperties } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

export type ColorTheme = 'blue' | 'emerald' | 'purple' | 'slate';

export interface HeroContent {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  description: string;
  badge?: string;
  primaryCTA?: {
    text: string;
    href: string;
  };
  secondaryCTA?: {
    text: string;
    href: string;
  };
  backgroundImage?: string;
}

export interface BenefitCard {
  icon: LucideIcon;
  title: string;
  value: string;
  description: string;
}

export interface Step {
  number: number;
  title: string;
  description: string;
  icon?: LucideIcon;
}

export interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface PricingTier {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  ctaText: string;
  ctaHref: string;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface FormConfig {
  type: 'partner' | 'business' | 'intake';
  title: string;
  description: string;
  fields: FormField[];
  submitText: string;
  onSubmit?: (data: Record<string, string>) => Promise<void>;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select';
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
}

export interface ServicePageTemplateProps {
  colorTheme: ColorTheme;
  hero: HeroContent;
  benefits?: BenefitCard[];
  steps?: Step[];
  features?: Feature[];
  pricing?: PricingTier[];
  faqs?: FAQ[];
  form?: FormConfig;
  children?: ReactNode;
}

// ═══════════════════════════════════════════════════════════════════════════
// COLOR THEME CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const themeConfig = {
  blue: {
    primary: '#3B82F6',
    primaryDark: '#2563EB',
    primaryLight: '#60A5FA',
    gradient: 'from-blue-500 to-blue-600',
    gradientText: 'from-blue-400 to-cyan-400',
    glowColor: 'rgba(59, 130, 246, 0.4)',
    bgAccent: 'bg-blue-500/10',
    borderAccent: 'border-blue-500/30',
    textAccent: 'text-blue-400',
    buttonBg: 'bg-blue-500 hover:bg-blue-600',
    badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    stepIconBg: 'bg-blue-500/10',
    stepIconText: 'text-blue-400',
    featureHover: 'hover:border-blue-500/50',
    ringFocus: 'focus:ring-blue-500',
  },
  emerald: {
    primary: '#10B981',
    primaryDark: '#059669',
    primaryLight: '#34D399',
    gradient: 'from-emerald-500 to-emerald-600',
    gradientText: 'from-emerald-400 to-teal-400',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    bgAccent: 'bg-emerald-500/10',
    borderAccent: 'border-emerald-500/30',
    textAccent: 'text-emerald-400',
    buttonBg: 'bg-emerald-500 hover:bg-emerald-600',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    stepIconBg: 'bg-emerald-500/10',
    stepIconText: 'text-emerald-400',
    featureHover: 'hover:border-emerald-500/50',
    ringFocus: 'focus:ring-emerald-500',
  },
  purple: {
    primary: '#8B5CF6',
    primaryDark: '#7C3AED',
    primaryLight: '#A78BFA',
    gradient: 'from-purple-500 to-purple-600',
    gradientText: 'from-purple-400 to-pink-400',
    glowColor: 'rgba(139, 92, 246, 0.4)',
    bgAccent: 'bg-purple-500/10',
    borderAccent: 'border-purple-500/30',
    textAccent: 'text-purple-400',
    buttonBg: 'bg-purple-500 hover:bg-purple-600',
    badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    stepIconBg: 'bg-purple-500/10',
    stepIconText: 'text-purple-400',
    featureHover: 'hover:border-purple-500/50',
    ringFocus: 'focus:ring-purple-500',
  },
  slate: {
    primary: '#64748B',
    primaryDark: '#475569',
    primaryLight: '#94A3B8',
    gradient: 'from-slate-500 to-slate-600',
    gradientText: 'from-slate-300 to-slate-400',
    glowColor: 'rgba(100, 116, 139, 0.4)',
    bgAccent: 'bg-slate-500/10',
    borderAccent: 'border-slate-500/30',
    textAccent: 'text-slate-400',
    buttonBg: 'bg-slate-500 hover:bg-slate-600',
    badgeBg: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    stepIconBg: 'bg-slate-500/10',
    stepIconText: 'text-slate-400',
    featureHover: 'hover:border-slate-500/50',
    ringFocus: 'focus:ring-slate-500',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// INTERSECTION OBSERVER HOOK FOR ANIMATIONS
// ═══════════════════════════════════════════════════════════════════════════

function useInView(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '50px', ...options }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [options]);

  return { ref, isInView };
}

// ═══════════════════════════════════════════════════════════════════════════
// ANIMATED WRAPPER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  animation?: 'fade-up' | 'fade-in' | 'scale-in';
}

function AnimatedSection({ children, className, delay = 0, animation = 'fade-up' }: AnimatedSectionProps) {
  const { ref, isInView } = useInView();

  const baseStyles = 'transition-all duration-700 ease-out';
  const hiddenStyles = {
    'fade-up': 'opacity-0 translate-y-8',
    'fade-in': 'opacity-0',
    'scale-in': 'opacity-0 scale-95',
  };
  const visibleStyles = {
    'fade-up': 'opacity-100 translate-y-0',
    'fade-in': 'opacity-100',
    'scale-in': 'opacity-100 scale-100',
  };

  return (
    <div
      ref={ref}
      className={cn(
        baseStyles,
        isInView ? visibleStyles[animation] : hiddenStyles[animation],
        className
      )}
      style={{ transitionDelay: `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HERO SECTION
// ═══════════════════════════════════════════════════════════════════════════

function HeroSection({ hero, theme }: { hero: HeroContent; theme: typeof themeConfig.blue }) {
  const Icon = hero.icon;

  return (
    <section
      className="relative min-h-[70vh] lg:min-h-[80vh] flex items-center overflow-hidden bg-black"
      aria-label={hero.title}
      role="region"
    >
      {/* Background Effects */}
      <div className="absolute inset-0">
        {/* Gradient orbs */}
        <div
          className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-30 blur-[100px] animate-marketing-float"
          style={{ background: `radial-gradient(circle, ${theme.primary} 0%, transparent 70%)` }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full opacity-20 blur-[120px] animate-marketing-float"
          style={{
            background: `radial-gradient(circle, ${theme.primaryLight} 0%, transparent 70%)`,
            animationDelay: '-4s'
          }}
        />

        {/* Grid pattern */}
        <div className="absolute inset-0 hero-grid opacity-30" />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black" />

        {/* Optional background image */}
        {hero.backgroundImage && (
          <div
            className="absolute inset-0 opacity-10 bg-cover bg-center"
            style={{ backgroundImage: `url(${hero.backgroundImage})` }}
          />
        )}
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="max-w-3xl mx-auto text-center">
          <AnimatedSection animation="fade-up">
            {/* Badge */}
            {hero.badge && (
              <div className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 border',
                theme.badgeBg
              )}>
                <span className="relative flex h-2 w-2">
                  <span
                    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                    style={{ backgroundColor: theme.primary }}
                  />
                  <span
                    className="relative inline-flex rounded-full h-2 w-2"
                    style={{ backgroundColor: theme.primary }}
                  />
                </span>
                <span className="text-sm font-medium">{hero.badge}</span>
              </div>
            )}

            {/* Icon */}
            <div
              className={cn(
                'inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-8',
                theme.bgAccent,
                theme.borderAccent,
                'border shadow-lg'
              )}
              style={{ boxShadow: `0 0 40px ${theme.glowColor}` }}
            >
              <Icon className={cn('h-10 w-10', theme.textAccent)} />
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6">
              {hero.title}
            </h1>

            {/* Subtitle with gradient */}
            <p className={cn(
              'text-xl sm:text-2xl font-semibold mb-4 bg-gradient-to-r bg-clip-text text-transparent',
              theme.gradientText
            )}>
              {hero.subtitle}
            </p>

            {/* Description */}
            <p className="text-lg text-[var(--marketing-gray-400)] max-w-2xl mx-auto mb-10">
              {hero.description}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {hero.primaryCTA && (
                <Link href={hero.primaryCTA.href}>
                  <Button
                    size="lg"
                    className={cn(
                      'w-full sm:w-auto text-white gap-2 shadow-lg transition-all duration-300',
                      theme.buttonBg
                    )}
                    style={{ boxShadow: `0 10px 30px ${theme.glowColor}` }}
                  >
                    {hero.primaryCTA.text}
                    <ArrowRight className="h-5 w-5" aria-hidden="true" />
                  </Button>
                </Link>
              )}
              {hero.secondaryCTA && (
                <Link href={hero.secondaryCTA.href}>
                  <Button
                    size="lg"
                    className="w-full sm:w-auto btn-marketing-outline"
                  >
                    {hero.secondaryCTA.text}
                  </Button>
                </Link>
              )}
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// BENEFITS SECTION
// ═══════════════════════════════════════════════════════════════════════════

function BenefitsSection({ benefits, theme }: { benefits: BenefitCard[]; theme: typeof themeConfig.blue }) {
  return (
    <section
      className="section-spacing-md bg-[var(--marketing-gray-950)]"
      aria-label="Key benefits"
      role="region"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <AnimatedSection key={index} animation="scale-in" delay={index * 100}>
                <div
                  className={cn(
                    'card-marketing p-6 text-center hover:-translate-y-2 transition-all duration-300 h-full',
                    theme.featureHover
                  )}
                >
                  <div
                    className={cn(
                      'inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4',
                      theme.bgAccent
                    )}
                  >
                    <Icon className={cn('h-7 w-7', theme.textAccent)} />
                  </div>
                  <div className={cn('text-3xl font-bold mb-2', theme.textAccent)}>
                    {benefit.value}
                  </div>
                  <div className="text-lg font-semibold text-white mb-1">
                    {benefit.title}
                  </div>
                  <p className="text-sm text-[var(--marketing-gray-500)]">
                    {benefit.description}
                  </p>
                </div>
              </AnimatedSection>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HOW IT WORKS SECTION
// ═══════════════════════════════════════════════════════════════════════════

function HowItWorksSection({ steps, theme }: { steps: Step[]; theme: typeof themeConfig.blue }) {
  return (
    <section
      className="section-spacing-lg bg-black"
      aria-label="How it works"
      role="region"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <AnimatedSection animation="fade-up" className="text-center mb-16">
          <span className={cn(
            'inline-block px-3 py-1 rounded-full text-sm font-medium mb-4 border',
            theme.badgeBg
          )}>
            Simple Process
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            How It <span className={theme.textAccent}>Works</span>
          </h2>
          <p className="text-[var(--marketing-gray-400)] max-w-2xl mx-auto">
            Get started in just a few simple steps
          </p>
        </AnimatedSection>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connection line */}
          <div className="hidden md:block absolute top-24 left-[16.67%] right-[16.67%] h-0.5 bg-gradient-to-r from-transparent via-[var(--marketing-gray-700)] to-transparent" />

          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <AnimatedSection key={index} animation="fade-up" delay={index * 150}>
                <div className="relative text-center">
                  {/* Step number circle */}
                  <div className="relative inline-block mb-6">
                    <div
                      className={cn(
                        'w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white',
                        'bg-gradient-to-br',
                        theme.gradient
                      )}
                      style={{ boxShadow: `0 0 30px ${theme.glowColor}` }}
                    >
                      {Icon ? <Icon className="h-7 w-7" /> : step.number}
                    </div>
                    {/* Step number badge */}
                    <div className={cn(
                      'absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
                      'bg-[var(--marketing-gray-900)] border-2',
                      theme.borderAccent,
                      theme.textAccent
                    )}>
                      {step.number}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-3">
                    {step.title}
                  </h3>
                  <p className="text-[var(--marketing-gray-400)]">
                    {step.description}
                  </p>
                </div>
              </AnimatedSection>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FEATURES GRID SECTION
// ═══════════════════════════════════════════════════════════════════════════

function FeaturesSection({ features, theme }: { features: Feature[]; theme: typeof themeConfig.blue }) {
  return (
    <section
      className="section-spacing-md bg-[var(--marketing-gray-950)]"
      aria-label="Features"
      role="region"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <AnimatedSection animation="fade-up" className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Everything You <span className={theme.textAccent}>Need</span>
          </h2>
          <p className="text-[var(--marketing-gray-400)] max-w-2xl mx-auto">
            Comprehensive features designed to help you succeed
          </p>
        </AnimatedSection>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <AnimatedSection key={index} animation="fade-up" delay={index * 100}>
                <div
                  className={cn(
                    'card-marketing p-6 group transition-all duration-300 h-full',
                    theme.featureHover,
                    'hover:bg-white/5'
                  )}
                >
                  <div
                    className={cn(
                      'inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 transition-transform duration-300 group-hover:scale-110',
                      theme.bgAccent
                    )}
                  >
                    <Icon className={cn('h-6 w-6', theme.textAccent)} />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-[var(--marketing-gray-400)] text-sm">
                    {feature.description}
                  </p>
                </div>
              </AnimatedSection>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PRICING SECTION
// ═══════════════════════════════════════════════════════════════════════════

function PricingSection({ pricing, theme }: { pricing: PricingTier[]; theme: typeof themeConfig.blue }) {
  return (
    <section
      className="section-spacing-lg bg-black"
      aria-label="Pricing"
      role="region"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <AnimatedSection animation="fade-up" className="text-center mb-16">
          <span className={cn(
            'inline-block px-3 py-1 rounded-full text-sm font-medium mb-4 border',
            theme.badgeBg
          )}>
            Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Choose Your <span className={theme.textAccent}>Plan</span>
          </h2>
          <p className="text-[var(--marketing-gray-400)] max-w-2xl mx-auto">
            Transparent pricing with no hidden fees
          </p>
        </AnimatedSection>

        {/* Pricing Cards */}
        <div className={cn(
          'grid gap-8',
          pricing.length === 1 ? 'max-w-md mx-auto' : '',
          pricing.length === 2 ? 'sm:grid-cols-2 max-w-3xl mx-auto' : '',
          pricing.length >= 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : ''
        )}>
          {pricing.map((tier, index) => (
            <AnimatedSection key={index} animation="scale-in" delay={index * 150}>
              <div
                className={cn(
                  'card-marketing p-8 relative h-full flex flex-col',
                  tier.highlighted && 'border-2',
                  tier.highlighted && theme.borderAccent,
                  tier.highlighted && 'shadow-xl'
                )}
                style={tier.highlighted ? { boxShadow: `0 0 40px ${theme.glowColor}` } : {}}
              >
                {tier.highlighted && (
                  <div className={cn(
                    'absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-sm font-semibold',
                    'bg-gradient-to-r text-white',
                    theme.gradient
                  )}>
                    Most Popular
                  </div>
                )}

                <div className="text-center mb-8">
                  <h3 className="text-xl font-bold text-white mb-2">
                    {tier.name}
                  </h3>
                  <div className="mb-2">
                    <span className={cn('text-4xl font-bold', theme.textAccent)}>
                      {tier.price}
                    </span>
                    {tier.period && (
                      <span className="text-[var(--marketing-gray-500)] ml-1">
                        /{tier.period}
                      </span>
                    )}
                  </div>
                  <p className="text-[var(--marketing-gray-400)] text-sm">
                    {tier.description}
                  </p>
                </div>

                <ul className="space-y-4 mb-8 flex-grow">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className={cn('h-5 w-5 flex-shrink-0 mt-0.5', theme.textAccent)} />
                      <span className="text-[var(--marketing-gray-300)] text-sm">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link href={tier.ctaHref} className="mt-auto">
                  <Button
                    className={cn(
                      'w-full',
                      tier.highlighted
                        ? cn(theme.buttonBg, 'text-white')
                        : 'btn-marketing-outline'
                    )}
                    size="lg"
                  >
                    {tier.ctaText}
                  </Button>
                </Link>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FAQ ACCORDION SECTION
// ═══════════════════════════════════════════════════════════════════════════

function FAQItem({
  faq,
  isOpen,
  onToggle,
  theme,
}: {
  faq: FAQ;
  isOpen: boolean;
  onToggle: () => void;
  theme: typeof themeConfig.blue;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(isOpen ? contentRef.current.scrollHeight : 0);
    }
  }, [isOpen]);

  return (
    <div className={cn(
      'card-marketing overflow-hidden transition-all duration-300',
      isOpen && theme.borderAccent
    )}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 text-left"
        aria-expanded={isOpen}
      >
        <span className="text-lg font-semibold text-white pr-4">
          {faq.question}
        </span>
        <span className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors',
          isOpen ? theme.bgAccent : 'bg-[var(--marketing-gray-800)]'
        )}>
          {isOpen ? (
            <ChevronUp className={cn('h-5 w-5', theme.textAccent)} />
          ) : (
            <ChevronDown className="h-5 w-5 text-[var(--marketing-gray-400)]" />
          )}
        </span>
      </button>
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ height }}
      >
        <div ref={contentRef} className="px-6 pb-6 text-[var(--marketing-gray-400)]">
          {faq.answer}
        </div>
      </div>
    </div>
  );
}

function FAQSection({ faqs, theme }: { faqs: FAQ[]; theme: typeof themeConfig.blue }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section
      className="section-spacing-md bg-[var(--marketing-gray-950)]"
      aria-label="Frequently asked questions"
      role="region"
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <AnimatedSection animation="fade-up" className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Frequently Asked <span className={theme.textAccent}>Questions</span>
          </h2>
          <p className="text-[var(--marketing-gray-400)]">
            Everything you need to know about our service
          </p>
        </AnimatedSection>

        {/* FAQ Accordion */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <AnimatedSection key={index} animation="fade-up" delay={index * 100}>
              <FAQItem
                faq={faq}
                isOpen={openIndex === index}
                onToggle={() => setOpenIndex(openIndex === index ? null : index)}
                theme={theme}
              />
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FORM SECTION
// ═══════════════════════════════════════════════════════════════════════════

function FormSection({ form, theme }: { form: FormConfig; theme: typeof themeConfig.blue }) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (form.onSubmit) {
        await form.onSubmit(formData);
      }
      setIsSubmitted(true);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (isSubmitted) {
    return (
      <section
        className="section-spacing-lg bg-black"
        aria-label="Form submitted"
      >
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection animation="scale-in">
            <div
              className={cn(
                'inline-flex items-center justify-center w-20 h-20 rounded-full mb-8',
                theme.bgAccent
              )}
            >
              <CheckCircle2 className={cn('h-10 w-10', theme.textAccent)} />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Thank You!
            </h2>
            <p className="text-[var(--marketing-gray-400)] mb-8">
              We&apos;ve received your submission and will be in touch shortly.
            </p>
            <Button
              onClick={() => setIsSubmitted(false)}
              className="btn-marketing-outline"
            >
              Submit Another
            </Button>
          </AnimatedSection>
        </div>
      </section>
    );
  }

  return (
    <section
      className="section-spacing-lg bg-black relative overflow-hidden"
      aria-label={form.title}
      role="region"
    >
      {/* Background accent */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-10 blur-[100px]"
        style={{ background: theme.primary }}
      />

      <div className="relative max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection animation="fade-up">
          {/* Header */}
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              {form.title}
            </h2>
            <p className="text-[var(--marketing-gray-400)]">
              {form.description}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="card-marketing p-8">
            <div className="space-y-6">
              {form.fields.map((field) => (
                <div key={field.name}>
                  <label
                    htmlFor={field.name}
                    className="block text-sm font-medium text-white mb-2"
                  >
                    {field.label}
                    {field.required && <span className="text-red-400 ml-1">*</span>}
                  </label>

                  {field.type === 'textarea' ? (
                    <textarea
                      id={field.name}
                      name={field.name}
                      placeholder={field.placeholder}
                      required={field.required}
                      rows={4}
                      value={formData[field.name] || ''}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      className={cn(
                        'w-full px-4 py-3 rounded-xl',
                        'bg-[var(--marketing-gray-900)] border border-[var(--marketing-gray-700)]',
                        'text-white placeholder:text-[var(--marketing-gray-500)]',
                        'focus:outline-none focus:border-2 transition-colors',
                        theme.ringFocus.replace('focus:ring-', 'focus:border-')
                      )}
                    />
                  ) : field.type === 'select' ? (
                    <select
                      id={field.name}
                      name={field.name}
                      required={field.required}
                      value={formData[field.name] || ''}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      className={cn(
                        'w-full px-4 py-3 rounded-xl',
                        'bg-[var(--marketing-gray-900)] border border-[var(--marketing-gray-700)]',
                        'text-white',
                        'focus:outline-none focus:border-2 transition-colors',
                        theme.ringFocus.replace('focus:ring-', 'focus:border-')
                      )}
                    >
                      <option value="">{field.placeholder || 'Select an option'}</option>
                      {field.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={field.name}
                      name={field.name}
                      type={field.type}
                      placeholder={field.placeholder}
                      required={field.required}
                      value={formData[field.name] || ''}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      className={cn(
                        'w-full px-4 py-3 rounded-xl',
                        'bg-[var(--marketing-gray-900)] border border-[var(--marketing-gray-700)]',
                        'text-white placeholder:text-[var(--marketing-gray-500)]',
                        'focus:outline-none focus:border-2 transition-colors',
                        theme.ringFocus.replace('focus:ring-', 'focus:border-')
                      )}
                    />
                  )}
                </div>
              ))}
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className={cn(
                'w-full mt-8 text-white',
                theme.buttonBg
              )}
              isLoading={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : form.submitText}
            </Button>
          </form>
        </AnimatedSection>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN TEMPLATE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function ServicePageTemplate({
  colorTheme,
  hero,
  benefits,
  steps,
  features,
  pricing,
  faqs,
  form,
  children,
}: ServicePageTemplateProps) {
  const theme = themeConfig[colorTheme];

  return (
    <div className="marketing-dark">
      <HeroSection hero={hero} theme={theme} />

      {benefits && benefits.length > 0 && (
        <BenefitsSection benefits={benefits} theme={theme} />
      )}

      {steps && steps.length > 0 && (
        <HowItWorksSection steps={steps} theme={theme} />
      )}

      {features && features.length > 0 && (
        <FeaturesSection features={features} theme={theme} />
      )}

      {pricing && pricing.length > 0 && (
        <PricingSection pricing={pricing} theme={theme} />
      )}

      {faqs && faqs.length > 0 && (
        <FAQSection faqs={faqs} theme={theme} />
      )}

      {form && (
        <FormSection form={form} theme={theme} />
      )}

      {children}
    </div>
  );
}

export default ServicePageTemplate;
