'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Search,
  ChevronDown,
  HelpCircle,
  Users,
  Briefcase,
  Shield,
  Mail,
  MessageSquare,
  GraduationCap,
  BadgeCheck,
  Clock,
  FileText,
  CreditCard,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ═══════════════════════════════════════════════════════════════════════════
// FAQ DATA - Organized by Category
// ═══════════════════════════════════════════════════════════════════════════

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
}

interface FAQCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'cyan' | 'lime' | 'gold' | 'magenta';
  faqs: FAQItem[];
}

const faqCategories: FAQCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Sign up, verification, and profile setup',
    icon: GraduationCap,
    color: 'cyan',
    faqs: [
      {
        id: 'gs-1',
        question: 'How do I sign up for GradeUp?',
        answer: 'Signing up is quick and free! Click "Join as Athlete" on our homepage, enter your email, create a password, and follow the prompts to complete your profile. You\'ll need to provide your school, sport, and academic information. The entire process takes about 10 minutes.',
        keywords: ['sign up', 'register', 'create account', 'join', 'new'],
      },
      {
        id: 'gs-2',
        question: 'What is the verification process?',
        answer: 'We verify three key aspects: (1) Enrollment - we confirm you\'re actively enrolled at your university, (2) Sport - we verify your participation on an NCAA-sanctioned team, and (3) GPA - we verify your academic standing through official transcripts or registrar confirmation. Verification typically takes 24-48 hours and ensures authenticity for both athletes and brands.',
        keywords: ['verify', 'verification', 'confirm', 'authenticate', 'check'],
      },
      {
        id: 'gs-3',
        question: 'What GPA do I need to join?',
        answer: 'There\'s no minimum GPA requirement to get verified on GradeUp. A higher verified GPA (3.0+, 3.5+) is a stronger credential - it\'s one of the signals StatStaq\'s team uses when sourcing and pricing your deals, alongside your sport, followers, and engagement. Get verified first; StatStaq takes it from there.',
        keywords: ['gpa', 'grades', 'academic', 'minimum', 'requirement'],
      },
      {
        id: 'gs-4',
        question: 'How do I set up my athlete profile?',
        answer: 'After signing up, you\'ll complete your profile by adding: a professional photo, your athletic achievements, academic highlights (major, GPA, honors), social media links, and a bio that showcases your personal brand. Strong profiles include high-quality images, complete information, and authentic storytelling about your journey as a scholar-athlete.',
        keywords: ['profile', 'setup', 'complete', 'photo', 'bio'],
      },
      {
        id: 'gs-5',
        question: 'Is GradeUp free for athletes?',
        answer: 'Yes! GradeUp is completely free for athletes. We never charge athletes to join, create profiles, or access deal opportunities. Our platform earns a small percentage from completed deals, so we only succeed when you succeed. There are no hidden fees, subscription costs, or premium tiers for athletes.',
        keywords: ['free', 'cost', 'fee', 'price', 'charge', 'money'],
      },
    ],
  },
  {
    id: 'for-athletes',
    title: 'For Athletes',
    description: 'Deals, earnings, and payment information',
    icon: Users,
    color: 'lime',
    faqs: [
      {
        id: 'ath-1',
        question: 'How do NIL deals work on GradeUp?',
        answer: 'Once your GPA is verified, StatStaq\'s team takes over: they produce your content, value your brand, source the deal from a brand looking for your sport and school, and negotiate the terms and compensation on your behalf. You review the contract they bring you - deliverables, compensation, timeline - and sign if it works for you. Every deal runs through GradeUp\'s compliance layer with NCAA-compliant contracts.',
        keywords: ['deals', 'nil', 'work', 'how', 'process'],
      },
      {
        id: 'ath-2',
        question: 'How does GPA affect my earning potential?',
        answer: 'Your GPA directly feeds your GradeUp Score, which StatStaq\'s team uses when sourcing and pricing deals on your behalf - brands weight the "scholar-athlete" credential heavily. We don\'t publish a fixed GPA-to-dollar formula because deal value also depends on sport, following, and market, but Dean\'s List recognition, academic awards, and maintaining strong grades while competing are exactly the signals StatStaq brings to a brand conversation.',
        keywords: ['gpa', 'earning', 'money', 'compensation', 'value'],
      },
      {
        id: 'ath-3',
        question: 'When and how do I get paid?',
        answer: 'Payment is processed within 5-7 business days after you complete all deal deliverables and StatStaq\'s team confirms the brand\'s approval. You can choose direct deposit (ACH), PayPal, or Venmo. Minimum payout threshold is $25. For larger deals, milestone payments may be arranged. All payments are tracked in your dashboard with tax-ready reporting (1099 forms provided annually).',
        keywords: ['paid', 'payment', 'money', 'deposit', 'payout', 'when'],
      },
      {
        id: 'ath-4',
        question: 'What types of deals are available?',
        answer: 'StatStaq sources several deal types for GradeUp-verified athletes: Social Media Posts (Instagram, TikTok, Twitter/X), Brand Ambassador programs (ongoing partnerships), Product Endorsements, Appearances (events, camps, clinics), Content Creation (photos, videos), and Academic Mentorship programs. Deal values range from $100 for single posts to $10,000+ for comprehensive ambassador packages.',
        keywords: ['types', 'kinds', 'deals', 'opportunities', 'ambassador'],
      },
      {
        id: 'ath-5',
        question: 'Can I negotiate deal terms?',
        answer: 'You\'re never negotiating alone. When StatStaq\'s team brings you an offer, you can accept it, decline it, or ask them to push back on terms through our messaging system. Common negotiation points include compensation amount, deliverable timeline, usage rights, and exclusivity terms - StatStaq negotiates those directly with the brand on your behalf, using market rate data to get you a fair deal.',
        keywords: ['negotiate', 'counter', 'terms', 'offer', 'change'],
      },
    ],
  },
  {
    id: 'for-brands',
    title: 'For Brands',
    description: 'Campaigns, athlete discovery, and compliance',
    icon: Briefcase,
    color: 'gold',
    faqs: [
      {
        id: 'br-1',
        question: 'How do I find the right athletes for my brand?',
        answer: 'Our advanced filtering system lets you search by GPA range, sport, school, geographic region, follower count, engagement rate, and more. The GradeUp Score combines a verified academic achievement with social influence to identify high-value partnerships. You can also browse curated collections like "Dean\'s List Athletes" or "Rising Stars" to discover emerging talent - once you find a match, StatStaq\'s team runs outreach, negotiation, and close on your behalf.',
        keywords: ['find', 'search', 'discover', 'athletes', 'filter'],
      },
      {
        id: 'br-2',
        question: 'Are all deals NCAA compliant?',
        answer: 'Every deal on GradeUp is structured to comply with current NCAA NIL rules and state-specific regulations. Our contracts include standard compliance language, and we automatically flag potential issues. Athletes must disclose school NIL office contacts, and we can coordinate with compliance departments when required. We stay current with evolving regulations to protect both parties.',
        keywords: ['ncaa', 'compliant', 'compliance', 'legal', 'rules'],
      },
      {
        id: 'br-3',
        question: 'What does brand partnership cost?',
        answer: 'Brand accounts are free to create and browse athletes. When you execute a deal, GradeUp charges a 15% platform fee on the deal value (paid by the brand, not the athlete). This covers contract management, payment processing, compliance verification, and platform support. Volume discounts are available for brands running multiple campaigns.',
        keywords: ['cost', 'price', 'fee', 'charge', 'pricing'],
      },
      {
        id: 'br-4',
        question: 'How do I track campaign performance?',
        answer: 'Your brand dashboard includes comprehensive analytics: reach, impressions, engagement rates, click-throughs (for trackable links), and ROI calculations. You can compare performance across athletes, campaigns, and time periods. For social media deliverables, we integrate with platform APIs to pull real performance data. Export reports for your internal stakeholders anytime.',
        keywords: ['track', 'analytics', 'performance', 'metrics', 'roi'],
      },
      {
        id: 'br-5',
        question: 'Can I run exclusive ambassador programs?',
        answer: 'Yes! You can request an exclusive partnership where an athlete commits to representing only your brand within their category (e.g., "exclusive nutrition sponsor"). StatStaq\'s team negotiates the terms and brings you a contract, with exclusivity clearly defined and a set duration. Ambassador programs typically include monthly retainers, product provisions, and bonus structures tied to performance milestones.',
        keywords: ['exclusive', 'ambassador', 'program', 'partnership', 'long-term'],
      },
    ],
  },
  {
    id: 'account-security',
    title: 'Account & Security',
    description: 'Password, privacy, and data protection',
    icon: Shield,
    color: 'magenta',
    faqs: [
      {
        id: 'sec-1',
        question: 'How do I reset my password?',
        answer: 'Click "Forgot Password" on the login page, enter your email address, and we\'ll send a secure reset link (valid for 24 hours). Follow the link to create a new password. For security, passwords must be at least 8 characters with a mix of letters, numbers, and symbols. If you don\'t receive the email, check spam or contact support.',
        keywords: ['password', 'reset', 'forgot', 'change', 'login'],
      },
      {
        id: 'sec-2',
        question: 'What data does GradeUp collect?',
        answer: 'We collect information you provide (name, school, sport, GPA, social links) plus platform usage data to improve our service. For athletes, we verify academic and athletic status through official channels. We never sell personal data to third parties. Financial information (for payments) is encrypted and processed by PCI-compliant payment providers. See our Privacy Policy for complete details.',
        keywords: ['data', 'privacy', 'information', 'collect', 'personal'],
      },
      {
        id: 'sec-3',
        question: 'How is my GPA information protected?',
        answer: 'Your exact GPA is visible only to you. Brands see a GPA range (e.g., "3.5-4.0") and your GradeUp Score, but not your precise number. Academic verification is handled through secure institutional partnerships. We use strong encryption for all sensitive data.',
        keywords: ['gpa', 'protected', 'privacy', 'secure', 'visible'],
      },
      {
        id: 'sec-4',
        question: 'Can I delete my account?',
        answer: 'Yes, you can request account deletion anytime from Settings > Account > Delete Account. We\'ll confirm via email, and your profile will be removed within 30 days. Note that completed deal records are retained for tax and legal compliance (7 years). If you have pending deals or unpaid balances, those must be resolved before deletion.',
        keywords: ['delete', 'remove', 'account', 'deactivate', 'close'],
      },
      {
        id: 'sec-5',
        question: 'Does GradeUp support two-factor authentication?',
        answer: 'Yes! We strongly recommend enabling 2FA for added security. Go to Settings > Security > Two-Factor Authentication. You can use authenticator apps (Google Authenticator, Authy) or receive codes via SMS. Once enabled, you\'ll enter a verification code each time you log in from a new device. This protects your account and earnings.',
        keywords: ['2fa', 'two-factor', 'authentication', 'security', 'verify'],
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// HERO SECTION WITH SEARCH
// ═══════════════════════════════════════════════════════════════════════════

function HelpHeroSection({
  searchQuery,
  setSearchQuery,
}: {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}) {
  return (
    <section
      className="relative pt-32 pb-16 lg:pt-40 lg:pb-24 overflow-hidden bg-[var(--cream)]"
      aria-label="Help center hero"
    >
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--cream-surface)] border border-[var(--hairline)] mb-8">
          <HelpCircle className="h-4 w-4 text-[var(--accent-primary)]" />
          <span className="text-sm font-medium text-[var(--ink)]">Help Center</span>
        </div>

        {/* Headline */}
        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--ink)] mb-6">
          How Can We{' '}
          <span className="text-[var(--accent-primary)]">Help You?</span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-[var(--ink-muted)] max-w-2xl mx-auto mb-10">
          Find answers to common questions about GradeUp, NIL deals, payments, and more.
        </p>

        <div className="duotone relative mx-auto mb-10 aspect-[21/9] max-w-2xl rounded-2xl overflow-hidden">
          <Image
            src="/editorial/photo-05.jpg"
            alt="GradeUp support team assisting a scholar-athlete family"
            fill
            sizes="(max-width: 1024px) 100vw, 640px"
            className="object-cover"
          />
        </div>

        {/* Search Bar */}
        <div className="relative max-w-xl mx-auto">
          <div className="absolute -inset-1 bg-gradient-to-r from-[var(--accent-primary)]/20 to-[var(--accent-tertiary)]/20 rounded-2xl blur-lg" />
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--marketing-gray-500)]"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Search for answers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-14 pl-12 pr-4 rounded-xl bg-[var(--marketing-gray-900)] border border-[var(--marketing-gray-700)] text-[var(--ink)] placeholder:text-[var(--marketing-gray-500)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/20 transition-all"
              aria-label="Search help articles"
            />
          </div>
        </div>

        {/* Quick Links */}
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          {['Getting Started', 'Payments', 'NCAA Compliance', 'GPA Requirements'].map((topic) => (
            <button
              key={topic}
              onClick={() => setSearchQuery(topic)}
              className="px-4 py-2 rounded-full bg-[var(--cream-surface)] border border-[var(--hairline)] text-sm text-[var(--ink-muted)] hover:bg-[var(--cream-section)] hover:text-[var(--ink)] transition-colors"
            >
              {topic}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FAQ ACCORDION COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function FAQAccordionItem({
  faq,
  isOpen,
  onToggle,
}: {
  faq: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-[var(--marketing-gray-800)] last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 py-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--marketing-gray-900)] rounded-sm group"
        aria-expanded={isOpen}
      >
        <span className="text-base sm:text-lg font-medium text-[var(--ink)] group-hover:text-[var(--accent-primary)] transition-colors">
          {faq.question}
        </span>
        <ChevronDown
          className={`h-5 w-5 text-[var(--marketing-gray-500)] transition-transform duration-200 flex-shrink-0 ${
            isOpen ? 'rotate-180 text-[var(--accent-primary)]' : ''
          }`}
          aria-hidden="true"
        />
      </button>
      <div
        className={`grid overflow-hidden transition-all duration-300 ${
          isOpen ? 'grid-rows-[1fr] pb-5' : 'grid-rows-[0fr]'
        }`}
      >
        <p className="text-[var(--marketing-gray-400)] leading-relaxed pr-8 min-h-0 overflow-hidden">
          {faq.answer}
        </p>
      </div>
    </div>
  );
}

function FAQCategorySection({
  category,
  openFAQs,
  toggleFAQ,
  highlightedFAQs,
}: {
  category: FAQCategory;
  openFAQs: Set<string>;
  toggleFAQ: (id: string) => void;
  highlightedFAQs: Set<string>;
}) {
  const colorClasses = {
    cyan: {
      bg: 'bg-[var(--accent-primary)]/10',
      border: 'border-[var(--accent-primary)]/30',
      text: 'text-[var(--accent-primary)]',
      icon: 'text-[var(--accent-primary)]',
    },
    lime: {
      bg: 'bg-[var(--accent-success)]/10',
      border: 'border-[var(--accent-success)]/30',
      text: 'text-[var(--accent-success)]',
      icon: 'text-[var(--accent-success)]',
    },
    gold: {
      bg: 'bg-[var(--accent-gold)]/10',
      border: 'border-[var(--accent-gold)]/30',
      text: 'text-[var(--accent-gold)]',
      icon: 'text-[var(--accent-gold)]',
    },
    magenta: {
      bg: 'bg-[var(--accent-tertiary)]/10',
      border: 'border-[var(--accent-tertiary)]/30',
      text: 'text-[var(--accent-tertiary)]',
      icon: 'text-[var(--accent-tertiary)]',
    },
  };

  const colors = colorClasses[category.color];
  const Icon = category.icon;

  // Filter FAQs based on search highlighting
  const visibleFAQs = highlightedFAQs.size > 0
    ? category.faqs.filter((faq) => highlightedFAQs.has(faq.id))
    : category.faqs;

  if (visibleFAQs.length === 0) return null;

  return (
    <div id={category.id} className="card-marketing p-6 sm:p-8 scroll-mt-24">
      {/* Category Header */}
      <div className="flex items-start gap-4 mb-6 pb-6 border-b border-[var(--marketing-gray-800)]">
        <div
          className={`flex-shrink-0 w-12 h-12 rounded-xl ${colors.bg} ${colors.border} border flex items-center justify-center`}
        >
          <Icon className={`h-6 w-6 ${colors.icon}`} />
        </div>
        <div>
          <h2 className={`text-xl font-bold text-[var(--ink)] mb-1`}>{category.title}</h2>
          <p className="text-sm text-[var(--marketing-gray-500)]">{category.description}</p>
        </div>
      </div>

      {/* FAQ Items */}
      <div>
        {visibleFAQs.map((faq) => (
          <FAQAccordionItem
            key={faq.id}
            faq={faq}
            isOpen={openFAQs.has(faq.id)}
            onToggle={() => toggleFAQ(faq.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════

function CategoryNav({
  activeCategory,
  setActiveCategory,
}: {
  activeCategory: string | null;
  setActiveCategory: (id: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-3 mb-12">
      <button
        onClick={() => setActiveCategory(null)}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
          activeCategory === null
            ? 'bg-[var(--accent-primary)] text-[var(--ink)]'
            : 'bg-[var(--cream-surface)] border border-[var(--hairline)] text-[var(--ink-muted)] hover:bg-[var(--cream-section)] hover:text-[var(--ink)]'
        }`}
      >
        All Topics
      </button>
      {faqCategories.map((category) => {
        const Icon = category.icon;
        return (
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeCategory === category.id
                ? 'bg-[var(--accent-primary)] text-[var(--ink)]'
                : 'bg-[var(--cream-surface)] border border-[var(--hairline)] text-[var(--ink-muted)] hover:bg-[var(--cream-section)] hover:text-[var(--ink)]'
            }`}
          >
            <Icon className="h-4 w-4" />
            {category.title}
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FAQ SECTION
// ═══════════════════════════════════════════════════════════════════════════

function FAQSection({
  searchQuery,
  activeCategory,
  setActiveCategory,
}: {
  searchQuery: string;
  activeCategory: string | null;
  setActiveCategory: (id: string | null) => void;
}) {
  const [openFAQs, setOpenFAQs] = useState<Set<string>>(new Set());

  const toggleFAQ = (id: string) => {
    setOpenFAQs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Search filtering
  const highlightedFAQs = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>();

    const query = searchQuery.toLowerCase();
    const matches = new Set<string>();

    faqCategories.forEach((category) => {
      category.faqs.forEach((faq) => {
        const matchesQuestion = faq.question.toLowerCase().includes(query);
        const matchesAnswer = faq.answer.toLowerCase().includes(query);
        const matchesKeywords = faq.keywords.some((kw) => kw.includes(query));

        if (matchesQuestion || matchesAnswer || matchesKeywords) {
          matches.add(faq.id);
        }
      });
    });

    return matches;
  }, [searchQuery]);

  // Filter categories based on active selection and search
  const visibleCategories = useMemo(() => {
    let filtered = faqCategories;

    if (activeCategory) {
      filtered = filtered.filter((cat) => cat.id === activeCategory);
    }

    if (highlightedFAQs.size > 0) {
      filtered = filtered.filter((cat) =>
        cat.faqs.some((faq) => highlightedFAQs.has(faq.id))
      );
    }

    return filtered;
  }, [activeCategory, highlightedFAQs]);

  const noResults = searchQuery.trim() && highlightedFAQs.size === 0;

  return (
    <section className="section-spacing-md bg-[var(--marketing-gray-950)]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Category Navigation */}
        {!searchQuery && (
          <CategoryNav activeCategory={activeCategory} setActiveCategory={setActiveCategory} />
        )}

        {/* Search Results Info */}
        {searchQuery && highlightedFAQs.size > 0 && (
          <div className="mb-8 p-4 rounded-xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20">
            <p className="text-[var(--accent-primary)] text-sm">
              Found {highlightedFAQs.size} result{highlightedFAQs.size !== 1 ? 's' : ''} for &quot;{searchQuery}&quot;
            </p>
          </div>
        )}

        {/* No Results */}
        {noResults && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-[var(--marketing-gray-800)] flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-[var(--marketing-gray-500)]" />
            </div>
            <h3 className="text-xl font-bold text-[var(--ink)] mb-2">No results found</h3>
            <p className="text-[var(--marketing-gray-400)] mb-6">
              We couldn&apos;t find any answers matching &quot;{searchQuery}&quot;. Try different keywords or browse categories.
            </p>
            <Button
              onClick={() => setActiveCategory(null)}
              className="btn-marketing-outline"
            >
              Browse All FAQs
            </Button>
          </div>
        )}

        {/* FAQ Categories */}
        <div className="space-y-6">
          {visibleCategories.map((category) => (
            <FAQCategorySection
              key={category.id}
              category={category}
              openFAQs={openFAQs}
              toggleFAQ={toggleFAQ}
              highlightedFAQs={highlightedFAQs}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// QUICK HELP CARDS
// ═══════════════════════════════════════════════════════════════════════════

function QuickHelpSection() {
  const quickHelp = [
    {
      icon: FileText,
      title: 'Documentation',
      description: 'Detailed guides on using GradeUp',
      link: '/help#getting-started',
      color: 'cyan' as const,
    },
    {
      icon: CreditCard,
      title: 'Payment Support',
      description: 'Help with payments and payouts',
      link: '/help#for-athletes',
      color: 'lime' as const,
    },
    {
      icon: BadgeCheck,
      title: 'Verification',
      description: 'Questions about the verification process',
      link: '/help#getting-started',
      color: 'gold' as const,
    },
    {
      icon: Lock,
      title: 'Account Security',
      description: 'Protect your account and data',
      link: '/help#account-security',
      color: 'magenta' as const,
    },
  ];

  const colorClasses = {
    cyan: 'text-[var(--accent-primary)] border-[var(--accent-primary)]/20 hover:border-[var(--accent-primary)]',
    lime: 'text-[var(--accent-success)] border-[var(--accent-success)]/20 hover:border-[var(--accent-success)]',
    gold: 'text-[var(--accent-gold)] border-[var(--accent-gold)]/20 hover:border-[var(--accent-gold)]',
    magenta: 'text-[var(--accent-tertiary)] border-[var(--accent-tertiary)]/20 hover:border-[var(--accent-tertiary)]',
  };

  return (
    <section className="py-12 bg-[var(--cream)]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-[var(--ink)] text-center mb-8">Quick Help</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickHelp.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                href={item.link}
                className={`group p-5 rounded-xl bg-[var(--marketing-gray-900)] border ${colorClasses[item.color]} transition-all hover:-translate-y-1`}
              >
                <Icon className={`h-6 w-6 mb-3 ${colorClasses[item.color].split(' ')[0]}`} />
                <h3 className="font-semibold text-[var(--ink)] mb-1">{item.title}</h3>
                <p className="text-sm text-[var(--marketing-gray-500)]">{item.description}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTACT SUPPORT CTA
// ═══════════════════════════════════════════════════════════════════════════

function ContactSupportSection() {
  return (
    <section className="section-spacing-md bg-marketing-cta relative overflow-hidden">
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-[var(--cream-surface)] border border-[var(--hairline)] flex items-center justify-center mx-auto mb-6">
          <MessageSquare className="h-8 w-8 text-[var(--accent-primary)]" />
        </div>

        <h2 className="font-display text-3xl sm:text-4xl font-bold text-[var(--ink)] mb-4">
          Still Need Help?
        </h2>
        <p className="text-xl text-[var(--ink-muted)] mb-8 max-w-2xl mx-auto">
          Our support team is here to help you succeed. Reach out and we&apos;ll get back to you within 24 hours.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="mailto:support@gradeup.com">
            <Button
              size="lg"
              className="btn-marketing-primary w-full sm:w-auto font-semibold gap-2"
            >
              <Mail className="h-5 w-5" />
              Email Support
            </Button>
          </Link>
          <Link href="/solutions/parents">
            <Button
              size="lg"
              className="btn-marketing-outline w-full sm:w-auto font-semibold gap-2"
            >
              <MessageSquare className="h-5 w-5" />
              Talk to our team
            </Button>
          </Link>
        </div>

        {/* Support Hours */}
        <div className="flex flex-wrap justify-center gap-6 mt-8 text-sm text-[var(--ink-meta)]">
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            Mon-Fri, 9am-6pm EST
          </span>
          <span className="flex items-center gap-1.5">
            <Mail className="h-4 w-4" />
            support@gradeup.com
          </span>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Clear category filter when searching
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (query) {
      setActiveCategory(null);
    }
  };

  return (
    <>
      <HelpHeroSection searchQuery={searchQuery} setSearchQuery={handleSearchChange} />
      <QuickHelpSection />
      <FAQSection
        searchQuery={searchQuery}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
      />
      <ContactSupportSection />
    </>
  );
}

