'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/brand';

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on Escape key press and lock body scroll (WCAG 2.2 requirement)
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };

    if (mobileMenuOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const navLinks = [
    { href: '/#athletes', label: 'Athletes' },
    { href: '/#brands', label: 'Brands' },
    { href: '/#how-it-works', label: 'How It Works' },
    { href: '/discover', label: 'Discover' },
    { href: '/opportunities', label: 'Opportunities' },
  ];

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'glass-marketing shadow-lg'
          : 'bg-transparent'
      )}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Primary navigation">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group transition-transform hover:scale-105">
            <Logo size="md" variant="gradient" />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-white/70 hover:text-[var(--marketing-cyan)] focus:text-[var(--marketing-cyan)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--marketing-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-sm transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-3">
            <Link href="/login">
              <Button
                variant="ghost"
                className="text-white hover:bg-white/10 hover:text-[var(--marketing-cyan)]"
              >
                Log In
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="btn-marketing-primary px-6">
                Get Started
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button - 44px min touch target for WCAG */}
          <button
            className="lg:hidden h-11 w-11 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-white/80 hover:text-white hover:bg-white/10 active:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--marketing-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-black transition-colors touch-manipulation"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Menu - Full screen overlay for better UX */}
      <div
        id="mobile-menu"
        className={cn(
          'lg:hidden fixed inset-0 top-16 z-40 bg-[var(--marketing-gray-900)] border-t border-[var(--marketing-gray-800)]',
          'transition-all duration-300 ease-in-out',
          mobileMenuOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-4 pointer-events-none'
        )}
        role="navigation"
        aria-label="Mobile navigation"
        aria-hidden={!mobileMenuOpen}
      >
        <div className="px-4 py-6 space-y-4 max-h-[calc(100vh-4rem)] overflow-y-auto">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block py-3 px-2 text-lg text-white/80 font-medium hover:text-[var(--marketing-cyan)] focus:text-[var(--marketing-cyan)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--marketing-cyan)] rounded-lg hover:bg-white/5 active:bg-white/10 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
              tabIndex={mobileMenuOpen ? 0 : -1}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-6 border-t border-[var(--marketing-gray-800)] space-y-3">
            <Link href="/login" className="block" onClick={() => setMobileMenuOpen(false)}>
              <Button
                variant="outline"
                className="w-full h-12 border-white/30 text-white hover:bg-white/10"
                tabIndex={mobileMenuOpen ? 0 : -1}
              >
                Log In
              </Button>
            </Link>
            <Link href="/signup" className="block" onClick={() => setMobileMenuOpen(false)}>
              <Button
                className="w-full h-12 btn-marketing-primary"
                tabIndex={mobileMenuOpen ? 0 : -1}
              >
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="bg-[var(--marketing-gray-950)] border-t border-[var(--marketing-gray-800)] text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="mb-4">
              <Logo size="md" variant="gradient" />
            </div>
            <p className="text-[var(--marketing-gray-400)] text-sm">
              The NIL platform where your GPA unlocks better deals.
            </p>
          </div>

          {/* For Athletes */}
          <div>
            <h3 className="font-semibold mb-4 text-[var(--marketing-cyan)]">For Athletes</h3>
            <ul className="space-y-2 text-sm text-[var(--marketing-gray-400)]">
              <li>
                <Link href="/signup/athlete" className="hover:text-white focus:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--marketing-cyan)] rounded-sm transition-colors">
                  Join as Athlete
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="hover:text-white focus:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--marketing-cyan)] rounded-sm transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/opportunities" className="hover:text-white focus:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--marketing-cyan)] rounded-sm transition-colors">
                  Browse Opportunities
                </Link>
              </li>
            </ul>
          </div>

          {/* For Brands */}
          <div>
            <h3 className="font-semibold mb-4 text-[var(--marketing-gold)]">For Brands</h3>
            <ul className="space-y-2 text-sm text-[var(--marketing-gray-400)]">
              <li>
                <Link href="/signup/brand" className="hover:text-white focus:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--marketing-gold)] rounded-sm transition-colors">
                  Partner With Us
                </Link>
              </li>
              <li>
                <Link href="/#athletes" className="hover:text-white focus:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--marketing-gold)] rounded-sm transition-colors">
                  Browse Athletes
                </Link>
              </li>
              <li>
                <Link href="/#brands" className="hover:text-white focus:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--marketing-gold)] rounded-sm transition-colors">
                  Why GradeUp
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-sm text-[var(--marketing-gray-400)]">
              <li>
                <Link href="/#how-it-works" className="hover:text-white focus:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-sm transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/help" className="hover:text-white focus:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-sm transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white focus:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-sm transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white focus:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-sm transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-[var(--marketing-gray-800)] flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-[var(--marketing-gray-500)]">
            © {new Date().getFullYear()} GradeUp NIL. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--marketing-lime)] px-3 py-1 rounded-full border border-[var(--marketing-lime)]/30 bg-[var(--marketing-lime)]/10">
              NCAA Compliant
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing-dark min-h-screen">
      {/* Skip Link for Accessibility - WCAG 2.4.1 */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--marketing-cyan)] focus:text-black focus:rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--marketing-cyan)]"
      >
        Skip to main content
      </a>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        {children}
      </main>
      <Footer />
    </div>
  );
}
