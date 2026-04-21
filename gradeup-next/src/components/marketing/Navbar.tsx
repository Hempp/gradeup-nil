'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Menu, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/brand';
import { LocaleSwitcher } from './LocaleSwitcher';

/**
 * Nav IA (post-consolidation, 2026-04-21).
 *
 * We collapsed 12 top-level items + 5 dropdown children down to 4 content
 * groups + 2 CTAs. Prior "convention" allowed each agent to shove a link
 * at a top level; that created an unusable wall of text. Everything now
 * sits inside one of four semantic hubs.
 *
 * Hubs
 * ────
 *   Product     — what GradeUp IS (persona pages, valuation tool, how-it-works).
 *   Directories — who is ON the platform (athletes, brands, opportunities).
 *   Pricing     — single link; it is its own decision.
 *   Resources   — proof + education (case studies, blog, competitor compare).
 *
 * Anchor links on `/` (#athletes, #brands, #how-it-works) are removed from
 * the nav. They only worked from the homepage and 404'd silently when the
 * user was on `/pricing` or `/blog`. Home-page scroll anchors stay inside
 * the homepage itself; they don't belong in global chrome.
 */

type NavChild = {
  href: string;
  label: string;
  description?: string;
};

type NavItem =
  | { kind: 'link'; href: string; label: string }
  | {
      kind: 'group';
      /** Stable id used for aria-controls and open-state tracking. */
      id: string;
      label: string;
      /** Optional hub link (the dropdown label stays a button, but we can
       *  offer an "Overview" row at the top of the panel when this is set). */
      overviewHref?: string;
      overviewLabel?: string;
      children: NavChild[];
    };

const NAV: NavItem[] = [
  {
    kind: 'group',
    id: 'product',
    label: 'Product',
    overviewHref: '/solutions',
    overviewLabel: 'All solutions overview',
    children: [
      { href: '/solutions/parents', label: 'For Parents', description: 'First deal without the risk' },
      { href: '/solutions/athletes', label: 'For Athletes', description: 'Your GPA is the advantage' },
      { href: '/solutions/brands', label: 'For Brands', description: 'Local, state-compliant, self-serve' },
      { href: '/solutions/ads', label: 'For Athletic Directors', description: 'Compliance you do not have to build' },
      { href: '/solutions/state-ads', label: 'State AD Portal', description: 'Oversight across member schools' },
      { href: '/hs/valuation', label: 'NIL Valuation', description: 'Estimate a deal in 60 seconds' },
    ],
  },
  {
    kind: 'group',
    id: 'directories',
    label: 'Directories',
    children: [
      { href: '/athletes', label: 'Athletes', description: 'Browse verified scholar-athletes' },
      { href: '/brands', label: 'Brands', description: 'Partners sponsoring locally' },
      { href: '/discover', label: 'Discover', description: 'Curated matches by sport + state' },
      { href: '/opportunities', label: 'Opportunities', description: 'Open deals accepting applications' },
    ],
  },
  { kind: 'link', href: '/pricing', label: 'Pricing' },
  {
    kind: 'group',
    id: 'resources',
    label: 'Resources',
    children: [
      { href: '/business/case-studies', label: 'Case Studies', description: 'Real deals, real outcomes' },
      { href: '/blog', label: 'Blog', description: 'NIL news + state rules' },
      { href: '/compare', label: 'Compare', description: 'GradeUp vs other platforms' },
    ],
  },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  /** Which desktop group dropdown is open, if any. Only one at a time. */
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  /** Which mobile accordion section is expanded. Only one at a time keeps
   *  the mobile menu scannable. */
  const [openMobileGroupId, setOpenMobileGroupId] = useState<string | null>(null);
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menus on Escape. Lock body scroll while the mobile sheet is open.
  // WCAG 2.2: keyboard users need ESC to escape every overlay.
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (mobileMenuOpen) setMobileMenuOpen(false);
      if (openGroupId) setOpenGroupId(null);
    };

    if (mobileMenuOpen || openGroupId) {
      document.addEventListener('keydown', handleEscape);
    }
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen, openGroupId]);

  // Close any open desktop dropdown on outside click.
  useEffect(() => {
    if (!openGroupId) return;
    const onDocClick = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenGroupId(null);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [openGroupId]);

  const toggleGroup = useCallback((id: string) => {
    setOpenGroupId((current) => (current === id ? null : id));
  }, []);

  const toggleMobileGroup = useCallback((id: string) => {
    setOpenMobileGroupId((current) => (current === id ? null : id));
  }, []);

  const closeAll = useCallback(() => {
    setOpenGroupId(null);
    setMobileMenuOpen(false);
    setOpenMobileGroupId(null);
  }, []);

  return (
    <header
      ref={navRef}
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled ? 'glass-marketing shadow-lg' : 'bg-transparent',
      )}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Primary navigation">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 group transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-sm"
          >
            <Logo size="md" variant="gradient" />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-6">
            {NAV.map((item) => {
              if (item.kind === 'link') {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-sm font-medium text-white/70 hover:text-[var(--accent-primary)] focus:text-[var(--accent-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-sm transition-colors py-2 min-h-[44px] flex items-center"
                  >
                    {item.label}
                  </Link>
                );
              }
              const isOpen = openGroupId === item.id;
              const menuId = `nav-menu-${item.id}`;
              return (
                <div key={item.id} className="relative">
                  <button
                    type="button"
                    className="text-sm font-medium text-white/70 hover:text-[var(--accent-primary)] focus:text-[var(--accent-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-sm transition-colors py-2 min-h-[44px] flex items-center gap-1"
                    aria-haspopup="true"
                    aria-expanded={isOpen}
                    aria-controls={menuId}
                    onClick={() => toggleGroup(item.id)}
                  >
                    {item.label}
                    <ChevronDown
                      className={cn('h-4 w-4 transition-transform', isOpen ? 'rotate-180' : '')}
                      aria-hidden="true"
                    />
                  </button>
                  {isOpen ? (
                    <div
                      id={menuId}
                      role="menu"
                      className="absolute left-1/2 top-full -translate-x-1/2 mt-2 w-[340px] rounded-xl border border-white/10 bg-[var(--marketing-gray-900)]/95 backdrop-blur-md shadow-2xl p-2"
                    >
                      {item.overviewHref ? (
                        <>
                          <Link
                            href={item.overviewHref}
                            role="menuitem"
                            className="block px-4 py-3 rounded-lg text-sm font-semibold text-[var(--accent-primary)] hover:bg-white/5 focus:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
                            onClick={closeAll}
                          >
                            {item.overviewLabel ?? 'Overview'}
                          </Link>
                          <div className="my-1 h-px bg-white/10" />
                        </>
                      ) : null}
                      {item.children.map((c) => (
                        <Link
                          key={c.href}
                          role="menuitem"
                          href={c.href}
                          className="block px-4 py-3 rounded-lg hover:bg-white/5 focus:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
                          onClick={closeAll}
                        >
                          <div className="text-sm font-semibold text-white">{c.label}</div>
                          {c.description ? (
                            <div className="text-xs text-white/60 mt-0.5">{c.description}</div>
                          ) : null}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
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
              <Button className="btn-marketing-primary px-6">Get Started</Button>
            </Link>
          </div>

          {/* Mobile Menu Button - 44px min touch target for WCAG */}
          <button
            className="lg:hidden h-11 w-11 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-white/80 hover:text-white hover:bg-white/10 active:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black transition-colors touch-manipulation"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu — full-screen accordion. One group expanded at a time. */}
      <div
        id="mobile-menu"
        className={cn(
          'lg:hidden fixed inset-0 top-16 z-40 bg-[var(--marketing-gray-900)] border-t border-[var(--marketing-gray-800)]',
          'transition-all duration-300 ease-in-out',
          mobileMenuOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-4 pointer-events-none',
        )}
        role="navigation"
        aria-label="Mobile navigation"
        aria-hidden={!mobileMenuOpen}
      >
        <div className="px-4 py-6 space-y-2 max-h-[calc(100vh-4rem)] overflow-y-auto">
          {NAV.map((item) => {
            if (item.kind === 'link') {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block py-3 px-2 min-h-[44px] text-lg text-white/90 font-medium hover:text-[var(--accent-primary)] focus:text-[var(--accent-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] rounded-lg hover:bg-white/5 active:bg-white/10 transition-colors"
                  onClick={closeAll}
                  tabIndex={mobileMenuOpen ? 0 : -1}
                >
                  {item.label}
                </Link>
              );
            }
            const isExpanded = openMobileGroupId === item.id;
            const panelId = `mobile-panel-${item.id}`;
            return (
              <div key={item.id} className="border-b border-white/5 pb-2">
                <button
                  type="button"
                  className="w-full flex items-center justify-between py-3 px-2 min-h-[44px] text-lg text-white font-semibold hover:text-[var(--accent-primary)] focus:text-[var(--accent-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] rounded-lg hover:bg-white/5 active:bg-white/10 transition-colors"
                  aria-expanded={isExpanded}
                  aria-controls={panelId}
                  onClick={() => toggleMobileGroup(item.id)}
                  tabIndex={mobileMenuOpen ? 0 : -1}
                >
                  <span>{item.label}</span>
                  <ChevronDown
                    className={cn('h-5 w-5 transition-transform', isExpanded ? 'rotate-180' : '')}
                    aria-hidden="true"
                  />
                </button>
                {isExpanded ? (
                  <div id={panelId} className="pl-4 pb-2 space-y-1">
                    {item.overviewHref ? (
                      <Link
                        href={item.overviewHref}
                        className="block py-2 px-2 min-h-[44px] text-sm font-semibold text-[var(--accent-primary)] hover:bg-white/5 focus:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] rounded-md"
                        onClick={closeAll}
                        tabIndex={mobileMenuOpen ? 0 : -1}
                      >
                        {item.overviewLabel ?? 'Overview'}
                      </Link>
                    ) : null}
                    {item.children.map((c) => (
                      <Link
                        key={c.href}
                        href={c.href}
                        className="block py-2 px-2 min-h-[44px] text-sm text-white/80 hover:text-[var(--accent-primary)] focus:text-[var(--accent-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] rounded-md hover:bg-white/5"
                        onClick={closeAll}
                        tabIndex={mobileMenuOpen ? 0 : -1}
                      >
                        <div className="font-medium">{c.label}</div>
                        {c.description ? (
                          <div className="text-xs text-white/50 mt-0.5">{c.description}</div>
                        ) : null}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
          <div className="pt-6 border-t border-[var(--marketing-gray-800)] space-y-3">
            <LocaleSwitcher variant="compact" className="mb-2" />
            <Link href="/login" className="block" onClick={closeAll}>
              <Button
                variant="outline"
                className="w-full h-12 border-white/30 text-white hover:bg-white/10"
                tabIndex={mobileMenuOpen ? 0 : -1}
              >
                Log In
              </Button>
            </Link>
            <Link href="/signup" className="block" onClick={closeAll}>
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
