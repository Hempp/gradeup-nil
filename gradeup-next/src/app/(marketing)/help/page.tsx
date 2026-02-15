'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  ChevronDown,
  HelpCircle,
  Users,
  Briefcase,
  Shield,
  Mail,
  MessageSquare,
  ArrowRight,
  GraduationCap,
  DollarSign,
  BadgeCheck,
  Clock,
  FileText,
  CreditCard,
  Lock,
  User,
  Settings,
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
        answer: 'There\'s no minimum GPA requirement to join GradeUp. However, our platform rewards academic excellence - athletes with higher GPAs (3.0+) typically receive more deal opportunities and higher compensation. A 3.5+ GPA unlocks premium brand partnerships. Your GPA is one factor brands consider alongside your sport, followers, and engagement.',
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
        answer: 'Once verified, your profile becomes visible to brands seeking athlete partnerships. Brands can send you deal offers directly, or you can apply to open opportunities. Each deal specifies deliverables (social posts, appearances, endorsements), compensation, and timeline. You review, negotiate if needed, and accept deals that align with your brand. All deals are managed through our platform with NCAA-compliant contracts.',
        keywords: ['deals', 'nil', 'work', 'how', 'process'],
      },
      {
        id: 'ath-2',
        question: 'How does GPA affect my earning potential?',
        answer: 'Your GPA directly influences your GradeUp Score, which brands use to evaluate partnerships. Athletes with 3.5+ GPAs typically see 40-60% higher deal values because brands value the "scholar-athlete" image. Dean\'s List recognition, academic awards, and maintaining strong grades while competing demonstrate discipline and reliability - qualities brands actively seek.',
        keywords: ['gpa', 'earning', 'money', 'compensation', 'value'],
      },
      {
        id: 'ath-3',
        question: 'When and how do I get paid?',
        answer: 'Payment is processed within 5-7 business days after you complete all deal deliverables and the brand confirms satisfaction. You can choose direct deposit (ACH), PayPal, or Venmo. Minimum payout threshold is $25. For larger deals, milestone payments may be arranged. All payments are tracked in your dashboard with tax-ready reporting (1099 forms provided annually).',
        keywords: ['paid', 'payment', 'money', 'deposit', 'payout', 'when'],
      },
      {
        id: 'ath-4',
        question: 'What types of deals are available?',
        answer: 'GradeUp offers various deal types: Social Media Posts (Instagram, TikTok, Twitter/X), Brand Ambassador programs (ongoing partnerships), Product Endorsements, Appearances (events, camps, clinics), Content Creation (photos, videos), and Academic Mentorship programs. Deal values range from $100 for single posts to $10,000+ for comprehensive ambassador packages.',
        keywords: ['types', 'kinds', 'deals', 'opportunities', 'ambassador'],
      },
      {
        id: 'ath-5',
        question: 'Can I negotiate deal terms?',
        answer: 'Absolutely! When you receive an offer, you can accept as-is, decline, or submit a counter-offer through our messaging system. Common negotiation points include compensation amount, deliverable timeline, usage rights, and exclusivity terms. Our platform provides market rate data to help you negotiate fairly. About 35% of deals go through some negotiation before finalizing.',
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
        answer: 'Our advanced filtering system lets you search by GPA range, sport, school, geographic region, follower count, engagement rate, and more. The GradeUp Score combines academic achievement with social influence to identify high-value partnerships. You can also browse curated collections like "Dean\'s List Athletes" or "Rising Stars" to discover emerging talent.',
        keywords: ['find', 'search', 'discover', 'athletes', 'filter'],
      },
      {
        id: 'br-2',
        question: 'Are all deals NCAA compliant?',
        answer: 'Yes, 100%. Every deal on GradeUp is structured to comply with current NCAA NIL rules and state-specific regulations. Our contracts include standard compliance language, and we automatically flag potential issues. Athletes must disclose school NIL office contacts, and we can coordinate with compliance departments when required. We stay current with evolving regulations to protect both parties.',
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
        answer: 'Yes! You can create exclusive partnerships where athletes commit to representing only your brand within their category (e.g., "exclusive nutrition sponsor"). Exclusivity terms are built into contracts with clear definitions and duration. Ambassador programs typically include monthly retainers, product provisions, and bonus structures tied to performance milestones.',
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
        answer: 'Your exact GPA is visible only to you. Brands see a GPA range (e.g., "3.5-4.0") and your GradeUp Score, but not your precise number. Academic verification is handled through secure institutional partnerships. We use bank-level encryption (AES-256) for all sensitive data, and our systems are SOC 2 Type II certified.',
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
      className="relative pt-32 pb-16 lg:pt-40 lg:pb-24 overflow-hidden bg-black"
      aria-label="Help center hero"
    >
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="hero-orb hero-orb-cyan absolute -top-40 -left-40 w-[400px] h-[400px]" />
        <div className="hero-orb hero-orb-magenta absolute -bottom-40 -right-40 w-[500px] h-[500px]" />
        <div className="absolute inset-0 hero-grid opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 mb-8">
          <HelpCircle className="h-4 w-4 text-[var(--marketing-cyan)]" />
          <span className="text-sm font-medium text-white/90">Help Center</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6">
          How Can We{' '}
          <span className="gradient-text-cyan">Help You?</span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-[var(--marketing-gray-400)] max-w-2xl mx-auto mb-10">
          Find answers to common questions about GradeUp, NIL deals, payments, and more.
        </p>

        {/* Search Bar */}
        <div className="relative max-w-xl mx-auto">
          <div className="absolute -inset-1 bg-gradient-to-r from-[var(--marketing-cyan)]/20 to-[var(--marketing-magenta)]/20 rounded-2xl blur-lg" />
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
              className="w-full h-14 pl-12 pr-4 rounded-xl bg-[var(--marketing-gray-900)] border border-[var(--marketing-gray-700)] text-white placeholder:text-[var(--marketing-gray-500)] focus:outline-none focus:border-[var(--marketing-cyan)] focus:ring-2 focus:ring-[var(--marketing-cyan)]/20 transition-all"
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
              className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
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
        className="w-full flex items-center justify-between gap-4 py-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--marketing-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--marketing-gray-900)] rounded-sm group"
        aria-expanded={isOpen}
      >
        <span className="text-base sm:text-lg font-medium text-white group-hover:text-[var(--marketing-cyan)] transition-colors">
          {faq.question}
        </span>
        <ChevronDown
          className={`h-5 w-5 text-[var(--marketing-gray-500)] transition-transform duration-200 flex-shrink-0 ${
            isOpen ? 'rotate-180 text-[var(--marketing-cyan)]' : ''
          }`}
          aria-hidden="true"
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? 'max-h-96 pb-5' : 'max-h-0'
        }`}
      >
        <p className="text-[var(--marketing-gray-400)] leading-relaxed pr-8">
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
      bg: 'bg-[var(--marketing-cyan)]/10',
      border: 'border-[var(--marketing-cyan)]/30',
      text: 'text-[var(--marketing-cyan)]',
      icon: 'text-[var(--marketing-cyan)]',
    },
    lime: {
      bg: 'bg-[var(--marketing-lime)]/10',
      border: 'border-[var(--marketing-lime)]/30',
      text: 'text-[var(--marketing-lime)]',
      icon: 'text-[var(--marketing-lime)]',
    },
    gold: {
      bg: 'bg-[var(--marketing-gold)]/10',
      border: 'border-[var(--marketing-gold)]/30',
      text: 'text-[var(--marketing-gold)]',
      icon: 'text-[var(--marketing-gold)]',
    },
    magenta: {
      bg: 'bg-[var(--marketing-magenta)]/10',
      border: 'border-[var(--marketing-magenta)]/30',
      text: 'text-[var(--marketing-magenta)]',
      icon: 'text-[var(--marketing-magenta)]',
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
    <div className="card-marketing p-6 sm:p-8">
      {/* Category Header */}
      <div className="flex items-start gap-4 mb-6 pb-6 border-b border-[var(--marketing-gray-800)]">
        <div
          className={`flex-shrink-0 w-12 h-12 rounded-xl ${colors.bg} ${colors.border} border flex items-center justify-center`}
        >
          <Icon className={`h-6 w-6 ${colors.icon}`} />
        </div>
        <div>
          <h2 className={`text-xl font-bold text-white mb-1`}>{category.title}</h2>
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
            ? 'bg-[var(--marketing-cyan)] text-black'
            : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
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
                ? 'bg-[var(--marketing-cyan)] text-black'
                : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
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
          <div className="mb-8 p-4 rounded-xl bg-[var(--marketing-cyan)]/10 border border-[var(--marketing-cyan)]/20">
            <p className="text-[var(--marketing-cyan)] text-sm">
              Found {highlightedFAQs.size} result{highlightedFAQs.size !== 1 ? 's' : ''} for "{searchQuery}"
            </p>
          </div>
        )}

        {/* No Results */}
        {noResults && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-[var(--marketing-gray-800)] flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-[var(--marketing-gray-500)]" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No results found</h3>
            <p className="text-[var(--marketing-gray-400)] mb-6">
              We couldn't find any answers matching "{searchQuery}". Try different keywords or browse categories.
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
      link: '#',
      color: 'cyan' as const,
    },
    {
      icon: CreditCard,
      title: 'Payment Support',
      description: 'Help with payments and payouts',
      link: '#',
      color: 'lime' as const,
    },
    {
      icon: BadgeCheck,
      title: 'Verification',
      description: 'Questions about the verification process',
      link: '#',
      color: 'gold' as const,
    },
    {
      icon: Lock,
      title: 'Account Security',
      description: 'Protect your account and data',
      link: '#',
      color: 'magenta' as const,
    },
  ];

  const colorClasses = {
    cyan: 'text-[var(--marketing-cyan)] border-[var(--marketing-cyan)]/20 hover:border-[var(--marketing-cyan)]',
    lime: 'text-[var(--marketing-lime)] border-[var(--marketing-lime)]/20 hover:border-[var(--marketing-lime)]',
    gold: 'text-[var(--marketing-gold)] border-[var(--marketing-gold)]/20 hover:border-[var(--marketing-gold)]',
    magenta: 'text-[var(--marketing-magenta)] border-[var(--marketing-magenta)]/20 hover:border-[var(--marketing-magenta)]',
  };

  return (
    <section className="py-12 bg-black">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-white text-center mb-8">Quick Help</h2>
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
                <h3 className="font-semibold text-white mb-1">{item.title}</h3>
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
      {/* Background */}
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2)_0%,transparent_60%)]" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-black/20 flex items-center justify-center mx-auto mb-6">
          <MessageSquare className="h-8 w-8 text-black" />
        </div>

        <h2 className="text-3xl sm:text-4xl font-bold text-black mb-4">
          Still Need Help?
        </h2>
        <p className="text-xl text-black/70 mb-8 max-w-2xl mx-auto">
          Our support team is here to help you succeed. Reach out and we'll get back to you within 24 hours.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="mailto:support@gradeup.com">
            <Button
              size="lg"
              className="w-full sm:w-auto bg-black hover:bg-[var(--marketing-gray-900)] text-white font-semibold gap-2"
            >
              <Mail className="h-5 w-5" />
              Email Support
            </Button>
          </Link>
          <Link href="#live-chat">
            <Button
              size="lg"
              className="w-full sm:w-auto bg-white/20 hover:bg-white/30 text-black font-semibold border-2 border-black/20 gap-2"
            >
              <MessageSquare className="h-5 w-5" />
              Live Chat
            </Button>
          </Link>
        </div>

        {/* Support Hours */}
        <div className="flex flex-wrap justify-center gap-6 mt-8 text-sm text-black/60">
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
