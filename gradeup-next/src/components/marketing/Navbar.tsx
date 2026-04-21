'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { Menu, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/brand';
import { LocaleSwitcher } from './LocaleSwitcher';

interface NavLink {
  href: string;
  label: string;
  /** Optional dropdown children. When present, href acts as the hub link
   *  behind the dropdown trigger (clicking the label goes to /solutions). */
  children?: Array<{ href: string; label: string; description?: string }>;
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const solutionsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on Escape key press and lock body scroll (WCAG 2.2 requirement).
  // Also closes the Solutions desktop dropdown on Escape.
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (mobileMenuOpen) setMobileMenuOpen(false);
        if (solutionsOpen) setSolutionsOpen(false);
      }
    };

    if (mobileMenuOpen || solutionsOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen, solutionsOpen]);

  // Close the Solutions dropdown when clicking outside of it.
  useEffect(() => {
    if (!solutionsOpen) return;
    const onDocClick = (event: MouseEvent) => {
      if (
        solutionsRef.current &&
        !solutionsRef.current.contains(event.target as Node)
      ) {
        setSolutionsOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [solutionsOpen]);

  // Nav order convention: VALUATION owns index 3 ("NIL Valuation"),
  // SOLUTIONS-PAGES owns index 4 ("Solutions"), CASE-STUDIES owns index 5
  // ("Case Studies"), PRICING owns index 6 ("Pricing"). Keep separate so
  // parallel agents can edit without collision.
  const navLinks: NavLink[] = [
    { href: '/#athletes', label: 'Athletes' },
    { href: '/#brands', label: 'Brands' },
    { href: '/#how-it-works', label: 'How It Works' },
    { href: '/hs/valuation', label: 'NIL Valuation' },
    {
      href: '/solutions',
      label: 'Solutions',
      children: [
        { href: '/solutions/parents', label: 'Parents', description: 'First deal without the risk' },
        { href: '/solutions/athletes', label: 'Athletes', description: 'Your GPA is the advantage' },
        { href: '/solutions/brands', label: 'Brands', description: 'Local, state-compliant, self-serve' },
        { href: '/solutions/ads', label: 'Athletic Directors', description: 'Compliance you do not have to build' },
        { href: '/solutions/state-ads', label: 'State AD Portal', description: 'Oversight across member schools' },
      ],
    },
    { href: '/business/case-studies', label: 'Case Studies' },
    { href: '/brands', label: 'Brands Directory' },
    { href: '/athletes', label: 'Athletes Directory' },
    { href: '/blog', label: 'Blog' },
    { href: '/pricing', label: 'Pricing' },
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
          <div className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => {
              if (link.children && link.children.length > 0) {
                const isOpen = solutionsOpen;
                return (
                  <div
                    key={link.href}
                    className="relative"
                    ref={solutionsRef}
                  >
                    <button
                      type="button"
                      className="text-sm font-medium text-white/70 hover:text-[var(--accent-primary)] focus:text-[var(--accent-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-sm transition-colors py-2 min-h-[44px] flex items-center gap-1"
                      aria-haspopup="true"
                      aria-expanded={isOpen}
                      aria-controls="solutions-menu"
                      onClick={() => setSolutionsOpen((v) => !v)}
                    >
                      {link.label}
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 transition-transform',
                          isOpen ? 'rotate-180' : ''
                        )}
                        aria-hidden="true"
                      />
                    </button>
                    {isOpen ? (
                      <div
                        id="solutions-menu"
                        role="menu"
                        className="absolute left-1/2 top-full -translate-x-1/2 mt-2 w-[320px] rounded-xl border border-white/10 bg-[var(--marketing-gray-900)]/95 backdrop-blur-md shadow-2xl p-2"
                      >
                        <Link
                          href={link.href}
                          role="menuitem"
                          className="block px-4 py-3 rounded-lg text-sm font-semibold text-[var(--accent-primary)] hover:bg-white/5 focus:bg-white/5 focus:outline-none"
                          onClick={() => setSolutionsOpen(false)}
                        >
                          Overview — all personas
                        </Link>
                        <div className="my-1 h-px bg-white/10" />
                        {link.children.map((c) => (
                          <Link
                            key={c.href}
                            role="menuitem"
                            href={c.href}
                            className="block px-4 py-3 rounded-lg hover:bg-white/5 focus:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
                            onClick={() => setSolutionsOpen(false)}
                          >
                            <div className="text-sm font-semibold text-white">
                              {c.label}
                            </div>
                            {c.description ? (
                              <div className="text-xs text-white/60 mt-0.5">
                                {c.description}
                              </div>
                            ) : null}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              }
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-white/70 hover:text-[var(--accent-primary)] focus:text-[var(--accent-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-sm transition-colors py-2 min-h-[44px] flex items-center"
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-3">
            <LocaleSwitcher />
            <Link href="/login">
              <Button
                variant="ghost"
                className="text-white hover:bg-white/10 hover:text-[var(--accent-primary)]"
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
            className="lg:hidden h-11 w-11 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-white/80 hover:text-white hover:bg-white/10 active:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black transition-colors touch-manipulation"
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
          {navLinks.map((link) => {
            if (link.children && link.children.length > 0) {
              return (
                <div key={link.href} className="space-y-1">
                  <Link
                    href={link.href}
                    className="block py-3 px-2 text-lg text-white font-semibold hover:text-[var(--accent-primary)] focus:text-[var(--accent-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] rounded-lg hover:bg-white/5 active:bg-white/10 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                    tabIndex={mobileMenuOpen ? 0 : -1}
                  >
                    {link.label}
                  </Link>
                  <div className="pl-4 space-y-1">
                    {link.children.map((c) => (
                      <Link
                        key={c.href}
                        href={c.href}
                        className="block py-2 px-2 text-sm text-white/70 hover:text-[var(--accent-primary)] focus:text-[var(--accent-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] rounded-md hover:bg-white/5"
                        onClick={() => setMobileMenuOpen(false)}
                        tabIndex={mobileMenuOpen ? 0 : -1}
                      >
                        {c.label}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            }
            return (
              <Link
                key={link.href}
                href={link.href}
                className="block py-3 px-2 text-lg text-white/80 font-medium hover:text-[var(--accent-primary)] focus:text-[var(--accent-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] rounded-lg hover:bg-white/5 active:bg-white/10 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
                tabIndex={mobileMenuOpen ? 0 : -1}
              >
                {link.label}
              </Link>
            );
          })}
          <div className="pt-6 border-t border-[var(--marketing-gray-800)] space-y-3">
            <LocaleSwitcher variant="compact" className="mb-2" />
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
